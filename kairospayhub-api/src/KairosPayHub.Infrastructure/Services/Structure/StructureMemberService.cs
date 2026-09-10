using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Roster member CRUD, email checks, and member DTO/profile helpers.
/// Extracted from StructureService so tree/template/node concerns stay separate.
/// </summary>
public class StructureMemberService(
    KairosDbContext db,
    StructureLeaderAccountService leaderAccounts,
    GivingScopeService givingScope,
    ChurchReadCache readCache)
{
    public async Task<StructureMemberListResponse> ListMembersAsync(
        Actor actor,
        Guid authUserId,
        int page,
        int pageSize,
        string? sortBy,
        string? sortDir,
        string? search,
        Guid? parentNodeId,
        bool includeDescendants,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await givingScope.CanAccessStructureReadAsync(actor, authUserId, ct);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId);

        if (!givingScope.CanManageChurch(actor))
        {
            var visibleNodeIds = await givingScope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
            if (visibleNodeIds.Count == 0)
                throw new ForbiddenException("You do not have a scope assignment");

            if (parentNodeId is null)
            {
                query = query.Where(m => visibleNodeIds.Contains(m.ParentNodeId));
            }
            else
            {
                await givingScope.CanAccessStructureNodeAsync(actor, authUserId, parentNodeId.Value, ct);

                if (includeDescendants)
                {
                    var nodeIds = await CollectSubtreeNodeIdsAsync(churchId, parentNodeId.Value, ct);
                    query = query.Where(m => nodeIds.Contains(m.ParentNodeId));
                }
                else
                {
                    query = query.Where(m => m.ParentNodeId == parentNodeId);
                }
            }
        }
        else if (parentNodeId is not null)
        {
            var nodeExists = await db.StructureNodes.AnyAsync(
                n => n.Id == parentNodeId && n.ChurchId == churchId, ct);
            if (!nodeExists)
                throw new ForbiddenException("Parent node not found in your church");

            if (includeDescendants)
            {
                var nodeIds = await CollectSubtreeNodeIdsAsync(churchId, parentNodeId.Value, ct);
                query = query.Where(m => nodeIds.Contains(m.ParentNodeId));
            }
            else
            {
                query = query.Where(m => m.ParentNodeId == parentNodeId);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(m =>
                EF.Functions.ILike(m.Name, term)
                || (m.Email != null && EF.Functions.ILike(m.Email, term))
                || (m.Phone != null && EF.Functions.ILike(m.Phone, term)));
        }

        var totalCount = await query.CountAsync(ct);
        var items = await ApplyMemberSort(query, sortBy, sortDir)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new StructureMemberListResponse(
            items.Select(ToMemberDto).ToList(),
            totalCount,
            page,
            pageSize);
    }

    public async Task<StructureMemberDto> GetMemberAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await givingScope.CanAccessStructureReadAsync(actor, authUserId, ct);

        var member = await db.ChurchMembers.AsNoTracking()
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found");

        if (!givingScope.CanManageChurch(actor))
        {
            var visibleNodeIds = await givingScope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
            if (!visibleNodeIds.Contains(member.ParentNodeId))
                throw new ForbiddenException("Member not found");
        }

        return ToMemberDto(member);
    }

    public async Task<StructureMemberDto> CreateMemberAsync(
        Actor actor,
        Guid authUserId,
        string name,
        Guid parentNodeId,
        string? email,
        string? phone,
        int? age,
        DateOnly? dateOfBirth,
        string? residence,
        MemberOccupationStatus? occupationStatus,
        string? schoolOrWorkplace,
        MemberPosition position,
        int? responsiveness,
        string? state = null,
        string? workplace = null,
        CancellationToken ct = default)
    {
        await RequireMemberManageAsync(actor, authUserId, parentNodeId, ct);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Define the structure template before adding members");

        var deepestLayer = template.Layers.OrderByDescending(l => l.SortOrder).First();
        if (deepestLayer.StandardType != StructureLayerType.Cell)
            throw new BadRequestException("The deepest org layer must be Cell before adding members");

        var parentNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == parentNodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Parent node not found in your church");

        if (parentNode.LayerId != deepestLayer.Id)
            throw new BadRequestException("Members must be placed on the deepest org layer");

        if (!string.IsNullOrWhiteSpace(email))
        {
            var rosterCheck = await CheckEmailAvailabilityAsync(
                actor,
                email,
                scope: "roster",
                excludeMemberId: null,
                ct);
            if (!rosterCheck.Available)
                throw new BadRequestException(rosterCheck.Message ?? "This email is already in use");
        }

        var member = new Member
        {
            ChurchId = churchId,
            ParentNodeId = parentNodeId,
            Name = name.Trim(),
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            Position = position,
            Responsiveness = ParseMemberResponsiveness(responsiveness),
        };
        ApplyMemberProfile(member, phone, dateOfBirth, residence, state, occupationStatus, schoolOrWorkplace, workplace);
        if (member.Age is null && age is not null)
            member.Age = age;
        db.ChurchMembers.Add(member);
        await SaveStructureChangesAsync(churchId, ct);

        return ToMemberDto(member);
    }

    public async Task<EmailAvailabilityDto> CheckEmailAvailabilityAsync(
        Actor actor,
        string email,
        string scope,
        Guid? excludeMemberId = null,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var trimmed = email.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return new EmailAvailabilityDto(false, "Email is required");

        var normalizedScope = scope.Trim().ToLowerInvariant();
        if (normalizedScope is not ("login" or "roster" or "both"))
            throw new BadRequestException("Scope must be login, roster, or both");

        if (normalizedScope is "login" or "both")
        {
            if (await leaderAccounts.LoginEmailIsTakenAsync(trimmed, ct))
                return new EmailAvailabilityDto(false, "A login account with this email already exists");
        }

        if (normalizedScope is "roster" or "both")
        {
            var normalizedEmail = trimmed.ToUpperInvariant();
            var query = db.ChurchMembers.AsNoTracking()
                .Where(m => m.ChurchId == churchId && m.Email != null && m.Email.ToUpper() == normalizedEmail);
            if (excludeMemberId is Guid memberId)
                query = query.Where(m => m.Id != memberId);

            if (await query.AnyAsync(ct))
                return new EmailAvailabilityDto(false, "A member with this email is already on your roster");
        }

        return new EmailAvailabilityDto(true, null);
    }

    public async Task<StructureMemberDto> LinkMemberAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        Guid parentNodeId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var member = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found in your church");

        await RequireMemberManageAsync(actor, authUserId, member.ParentNodeId, ct);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var deepestLayer = template.Layers.OrderByDescending(l => l.SortOrder).First();
        var parentNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == parentNodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Parent node not found in your church");

        if (parentNode.LayerId != deepestLayer.Id)
            throw new BadRequestException("Members must be placed on the deepest org layer");

        await RequireMemberManageAsync(actor, authUserId, parentNodeId, ct);

        member.ParentNodeId = parentNodeId;
        await SaveStructureChangesAsync(churchId, ct);

        return ToMemberDto(member);
    }

    public async Task<StructureMemberDto> UpdateMemberAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        string name,
        Guid parentNodeId,
        string? email,
        string? phone,
        int? age,
        DateOnly? dateOfBirth,
        string? residence,
        MemberOccupationStatus? occupationStatus,
        string? schoolOrWorkplace,
        MemberPosition position,
        int? responsiveness,
        string? state = null,
        string? workplace = null,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var member = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found in your church");

        await RequireMemberManageAsync(actor, authUserId, member.ParentNodeId, ct);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var deepestLayer = template.Layers.OrderByDescending(l => l.SortOrder).First();
        if (deepestLayer.StandardType != StructureLayerType.Cell)
            throw new BadRequestException("The deepest org layer must be Cell before updating members");

        var parentNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == parentNodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Parent node not found in your church");

        if (parentNode.LayerId != deepestLayer.Id)
            throw new BadRequestException("Members must be placed on the deepest org layer");

        await RequireMemberManageAsync(actor, authUserId, parentNodeId, ct);

        member.Name = name.Trim();
        member.ParentNodeId = parentNodeId;
        if (member.AuthUserId is null)
            member.Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        member.Position = position;
        if (responsiveness is not null)
            member.Responsiveness = ParseMemberResponsiveness(responsiveness);
        ApplyMemberProfile(member, phone, dateOfBirth, residence, state, occupationStatus, schoolOrWorkplace, workplace);
        if (member.Age is null && age is not null)
            member.Age = age;

        await SaveStructureChangesAsync(churchId, ct);

        return ToMemberDto(member);
    }

    public async Task DeleteMemberAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var member = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found in your church");

        await RequireMemberManageAsync(actor, authUserId, member.ParentNodeId, ct);

        var hasContributions = await db.Contributions
            .AnyAsync(c => c.MemberId == memberId, ct);
        if (hasContributions)
            throw new BadRequestException(
                "Cannot remove a member who has giving contributions. Keep their record for audit history.");

        var leaderNodes = await db.StructureNodes
            .Where(n => n.ChurchId == churchId && n.LeaderMemberId == memberId)
            .ToListAsync(ct);
        foreach (var node in leaderNodes)
            node.LeaderMemberId = null;

        db.ChurchMembers.Remove(member);
        await SaveStructureChangesAsync(churchId, ct);
    }

    public static StructureMemberDto ToMemberDto(Member member) =>
        new(
            member.Id,
            member.ParentNodeId,
            member.Name,
            member.Email,
            member.Phone,
            ResolveMemberAge(member),
            member.DateOfBirth,
            member.Residence,
            member.OccupationStatus?.ToString(),
            member.SchoolOrWorkplace,
            member.Position.ToString(),
            member.Responsiveness,
            member.State,
            member.Workplace);

    public static void ApplyMemberProfile(
        Member member,
        string? phone,
        DateOnly? dateOfBirth,
        string? residence,
        string? state,
        MemberOccupationStatus? occupationStatus,
        string? schoolOrWorkplace,
        string? workplace)
    {
        member.Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        member.DateOfBirth = dateOfBirth;
        member.Age = AgeFromDateOfBirth(dateOfBirth);
        member.Residence = string.IsNullOrWhiteSpace(residence) ? null : residence.Trim();
        member.State = string.IsNullOrWhiteSpace(state) ? null : state.Trim();
        member.OccupationStatus = occupationStatus;
        member.SchoolOrWorkplace = string.IsNullOrWhiteSpace(schoolOrWorkplace) ? null : schoolOrWorkplace.Trim();
        member.Workplace = string.IsNullOrWhiteSpace(workplace) ? null : workplace.Trim();
    }

    public static MemberOccupationStatus? ParseMemberOccupationStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (!Enum.TryParse<MemberOccupationStatus>(value.Trim(), ignoreCase: true, out var parsed))
            throw new BadRequestException("Invalid occupation status");
        return parsed;
    }

    public static int ParseMemberResponsiveness(int? value)
    {
        if (value is null)
            return 3;
        if (value is < 1 or > 5)
            throw new BadRequestException("Responsiveness must be between 1 and 5");
        return value.Value;
    }

    public static MemberPosition ParseMemberPosition(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return MemberPosition.Member;
        if (!Enum.TryParse<MemberPosition>(value.Trim(), ignoreCase: true, out var parsed))
            throw new BadRequestException("Invalid member position");
        return parsed;
    }

    private static IQueryable<Member> ApplyMemberSort(
        IQueryable<Member> query,
        string? sortBy,
        string? sortDir)
    {
        var desc = sortDir?.Equals("desc", StringComparison.OrdinalIgnoreCase) == true;
        return (sortBy?.Trim().ToLowerInvariant(), desc) switch
        {
            ("email", false) => query.OrderBy(m => m.Email).ThenBy(m => m.Name),
            ("email", true) => query.OrderByDescending(m => m.Email).ThenBy(m => m.Name),
            ("phone", false) => query.OrderBy(m => m.Phone).ThenBy(m => m.Name),
            ("phone", true) => query.OrderByDescending(m => m.Phone).ThenBy(m => m.Name),
            ("age", false) => query.OrderBy(m => m.Age).ThenBy(m => m.Name),
            ("age", true) => query.OrderByDescending(m => m.Age).ThenBy(m => m.Name),
            ("position", false) => query.OrderBy(m => m.Position).ThenBy(m => m.Name),
            ("position", true) => query.OrderByDescending(m => m.Position).ThenBy(m => m.Name),
            ("createdat", false) => query.OrderBy(m => m.CreatedAt).ThenBy(m => m.Name),
            ("createdat", true) => query.OrderByDescending(m => m.CreatedAt).ThenBy(m => m.Name),
            ("name", true) => query.OrderByDescending(m => m.Name),
            _ => query.OrderBy(m => m.Name),
        };
    }

    private static int? ResolveMemberAge(Member member) =>
        AgeFromDateOfBirth(member.DateOfBirth) ?? member.Age;

    private static int? AgeFromDateOfBirth(DateOnly? dateOfBirth)
    {
        if (dateOfBirth is null)
            return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dateOfBirth.Value.Year;
        if (dateOfBirth.Value > today.AddYears(-age))
            age--;

        return age >= 0 ? age : null;
    }

    private async Task<List<Guid>> CollectSubtreeNodeIdsAsync(
        Guid churchId,
        Guid rootId,
        CancellationToken ct)
    {
        var links = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId)
            .Select(n => new { n.Id, n.ParentNodeId })
            .ToListAsync(ct);

        var ids = new List<Guid> { rootId };
        var queue = new Queue<Guid>();
        queue.Enqueue(rootId);

        while (queue.Count > 0)
        {
            var parentId = queue.Dequeue();
            foreach (var child in links.Where(l => l.ParentNodeId == parentId))
            {
                ids.Add(child.Id);
                queue.Enqueue(child.Id);
            }
        }

        return ids;
    }

    private async Task<StructureTemplate?> LoadTemplateWithLayersAsync(Guid churchId, CancellationToken ct) =>
        await db.StructureTemplates
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

    private async Task SaveStructureChangesAsync(Guid churchId, CancellationToken ct)
    {
        await db.SaveChangesAsync(ct);
        readCache.InvalidateStructureTree(churchId);
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    private async Task RequireMemberManageAsync(
        Actor actor,
        Guid authUserId,
        Guid parentNodeId,
        CancellationToken ct)
    {
        await givingScope.CanAccessStructureNodeAsync(actor, authUserId, parentNodeId, ct);
    }
}
