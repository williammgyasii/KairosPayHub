using System.Security.Cryptography;
using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class UnitJoinInviteService(
    KairosDbContext db,
    GivingScopeService givingScope,
    LayerAccessService layerAccess,
    ChurchReadCache readCache)
{
    private static readonly int[] AllowedDurations = [1, 7, 30];
    public const int MaxPendingPerUnit = 25;

    public async Task<JoinInviteDto> MintAsync(
        Actor actor,
        Guid authUserId,
        Guid nodeId,
        int expiresInDays,
        CancellationToken ct = default)
    {
        if (!AllowedDurations.Contains(expiresInDays))
            throw new BadRequestException("ExpiresInDays must be 1, 7, or 30");

        var churchId = RequireStructureChurch(actor);
        await RequireDeepestScopeMintAsync(actor, authUserId, nodeId, ct);

        var existing = await db.UnitJoinInvites.Where(i => i.NodeId == nodeId).ToListAsync(ct);
        db.UnitJoinInvites.RemoveRange(existing);

        var invite = new UnitJoinInvite
        {
            ChurchId = churchId,
            NodeId = nodeId,
            Token = NewToken(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(expiresInDays),
            CreatedByAuthUserId = authUserId,
        };
        db.UnitJoinInvites.Add(invite);
        await db.SaveChangesAsync(ct);
        return new JoinInviteDto(invite.Token, invite.ExpiresAt);
    }

    public async Task<JoinInviteDto?> GetCurrentAsync(
        Actor actor,
        Guid authUserId,
        Guid nodeId,
        CancellationToken ct = default)
    {
        await RequireDeepestScopeMintAsync(actor, authUserId, nodeId, ct);
        var invite = await LiveInviteByNodeAsync(nodeId, ct);
        return invite is null ? null : new JoinInviteDto(invite.Token, invite.ExpiresAt);
    }

    public async Task<JoinInvitePreviewDto> PreviewAsync(string token, CancellationToken ct = default)
    {
        var invite = await RequireLiveInviteAsync(token, ct);
        var church = await db.StructureChurches.AsNoTracking()
            .SingleAsync(c => c.Id == invite.ChurchId, ct);
        var unit = await db.StructureNodes.AsNoTracking()
            .SingleAsync(n => n.Id == invite.NodeId, ct);
        return new JoinInvitePreviewDto(church.Name, unit.Name, church.CountryCode, invite.ExpiresAt);
    }

    public async Task SubmitAsync(
        string token,
        SubmitJoinInviteRequest request,
        CancellationToken ct = default)
    {
        var invite = await RequireLiveInviteAsync(token, ct);
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BadRequestException("Name is required");
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            throw new BadRequestException("Email is required");
        if (string.IsNullOrWhiteSpace(request.Phone))
            throw new BadRequestException("Phone is required");
        if (request.DateOfBirth is null)
            throw new BadRequestException("Birthday is required");

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var emailTaken = await db.ChurchMembers.AsNoTracking().AnyAsync(
            m => m.ChurchId == invite.ChurchId
                 && m.Email != null
                 && m.Email.ToUpper() == normalizedEmail,
            ct);
        if (emailTaken)
            return;

        var pendingCount = await db.ChurchMembers.CountAsync(
            m => m.ParentNodeId == invite.NodeId && m.RosterStatus == RosterStatus.Pending,
            ct);
        if (pendingCount >= MaxPendingPerUnit)
            throw new BadRequestException("Ask your leader for a new link");

        var member = new Member
        {
            ChurchId = invite.ChurchId,
            ParentNodeId = invite.NodeId,
            Name = request.Name.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Position = MemberPosition.Member,
            RosterStatus = RosterStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        StructureMemberService.ApplyMemberProfile(
            member,
            request.Phone,
            request.DateOfBirth,
            request.Residence,
            request.State,
            StructureMemberService.ParseMemberOccupationStatus(request.OccupationStatus),
            request.SchoolOrWorkplace,
            request.Workplace);
        db.ChurchMembers.Add(member);
        await db.SaveChangesAsync(ct);
        readCache.InvalidateStructureTree(invite.ChurchId);
    }

    public async Task<StructureMemberDto> AcceptAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        CancellationToken ct = default)
    {
        var member = await LoadPendingAsync(actor, authUserId, memberId, ct);
        member.RosterStatus = RosterStatus.Active;
        await db.SaveChangesAsync(ct);
        readCache.InvalidateStructureTree(member.ChurchId);
        return StructureMemberService.ToMemberDto(member);
    }

    public async Task DeclineAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        CancellationToken ct = default)
    {
        var member = await LoadPendingAsync(actor, authUserId, memberId, ct);
        db.ChurchMembers.Remove(member);
        await db.SaveChangesAsync(ct);
        readCache.InvalidateStructureTree(member.ChurchId);
    }

    private async Task<Member> LoadPendingAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        CancellationToken ct)
    {
        var churchId = RequireStructureChurch(actor);
        var member = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found");
        await layerAccess.EnsureCanManageRosterAsync(actor, authUserId, ct);
        await givingScope.CanAccessStructureNodeAsync(actor, authUserId, member.ParentNodeId, ct);
        if (member.RosterStatus != RosterStatus.Pending)
            throw new BadRequestException("Only pending join requests can be accepted or declined");
        return member;
    }

    private async Task RequireDeepestScopeMintAsync(
        Actor actor,
        Guid authUserId,
        Guid nodeId,
        CancellationToken ct)
    {
        var churchId = RequireStructureChurch(actor);
        await layerAccess.EnsureCanManageRosterAsync(actor, authUserId, ct);
        if (givingScope.CanManageChurch(actor))
            throw new ForbiddenException("Join links are for unit leaders");

        var scopeId = await givingScope.GetActorScopeNodeIdAsync(actor, authUserId, ct);
        if (scopeId != nodeId)
            throw new ForbiddenException("Join links are only for your unit");

        await givingScope.CanAccessStructureNodeAsync(actor, authUserId, nodeId, ct);

        var template = await db.StructureTemplates
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Define the structure template first");
        var deepest = template.Layers.OrderByDescending(l => l.SortOrder).First();
        var node = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Unit not found");
        if (node.LayerId != deepest.Id)
            throw new ForbiddenException("Join links are only for the deepest layer");
    }

    private async Task<UnitJoinInvite> RequireLiveInviteAsync(string token, CancellationToken ct)
    {
        var invite = await db.UnitJoinInvites.AsNoTracking()
            .SingleOrDefaultAsync(i => i.Token == token, ct);
        if (invite is null || invite.ExpiresAt <= DateTimeOffset.UtcNow)
            throw new BadRequestException("Ask your leader for a new link");
        return invite;
    }

    private async Task<UnitJoinInvite?> LiveInviteByNodeAsync(Guid nodeId, CancellationToken ct) =>
        await db.UnitJoinInvites.AsNoTracking()
            .SingleOrDefaultAsync(
                i => i.NodeId == nodeId && i.ExpiresAt > DateTimeOffset.UtcNow,
                ct);

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    private static string NewToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
}
