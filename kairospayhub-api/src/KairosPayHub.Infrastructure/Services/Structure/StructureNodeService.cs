using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Email;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Structure node CRUD, linking, and leader attachment.
/// Extracted from StructureService.
/// </summary>
public class StructureNodeService(
    KairosDbContext db,
    StructureLeaderAccountService leaderAccounts,
    AuthService auth,
    IEmailSender email,
    IOptions<EmailOptions> emailOptions,
    GivingScopeService givingScope,
    ChurchReadCache readCache)
{
    public async Task<CreateStructureNodeResponse> CreateNodeAsync(
        Actor actor,
        Guid layerId,
        Guid? parentNodeId,
        string name,
        string? unitNumber,
        Guid? leaderMemberId,
        NewStructureNodeLeaderRequest? newLeader,
        Guid? clientRequestId = null,
        CancellationToken ct = default)
    {
        RequireChurchManager(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Define the structure template before adding nodes");

        var layer = template.Layers.SingleOrDefault(l => l.Id == layerId)
            ?? throw new BadRequestException("Layer not found in your structure template");

        await ValidateNodeParentAsync(churchId, layer, parentNodeId, ct);

        var requestKey = clientRequestId is { } key && key != Guid.Empty ? key : (Guid?)null;
        if (requestKey is Guid replayKey)
        {
            var replayed = await TryReplayCreateAsync(churchId, replayKey, ct);
            if (replayed is not null)
                return replayed;
        }

        var trimmedName = name.Trim();
        var duplicateName = await db.StructureNodes.AnyAsync(
            n => n.ChurchId == churchId
                 && n.LayerId == layerId
                 && n.ParentNodeId == parentNodeId
                 && n.Name.ToLower() == trimmedName.ToLower(),
            ct);
        if (duplicateName)
            throw new BadRequestException("A unit with this name already exists under the same parent");

        var resolvedUnitNumber = NormalizeUnitNumber(unitNumber)
            ?? await NextUnitNumberAsync(churchId, layerId, parentNodeId, ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var node = new StructureNode
        {
            ChurchId = churchId,
            LayerId = layerId,
            ParentNodeId = parentNodeId,
            Name = trimmedName,
            UnitNumber = resolvedUnitNumber,
            ClientRequestId = requestKey,
        };
        db.StructureNodes.Add(node);
        await SaveStructureChangesAsync(churchId, ct);

        var generatedLogin = await ApplyNodeLeaderAsync(
            churchId, template, node, layer, leaderMemberId, newLeader, ct, sendInviteEmail: false);
        await SaveStructureChangesAsync(churchId, ct);
        await tx.CommitAsync(ct);

        await db.Entry(node).Reference(n => n.Leader).LoadAsync(ct);
        if (generatedLogin is not null && node.Leader?.AuthUserId is Guid authUserId)
        {
            await SendLeaderSetPasswordEmailAsync(
                churchId,
                layer,
                node.Name,
                node.Leader.Name,
                authUserId,
                generatedLogin.Email,
                ct);
        }

        return new CreateStructureNodeResponse(ToNodeDto(node), generatedLogin);
    }

    private async Task<CreateStructureNodeResponse?> TryReplayCreateAsync(
        Guid churchId,
        Guid clientRequestId,
        CancellationToken ct)
    {
        var existing = await db.StructureNodes
            .Include(n => n.Leader)
            .SingleOrDefaultAsync(
                n => n.ChurchId == churchId && n.ClientRequestId == clientRequestId,
                ct);
        return existing is null ? null : new CreateStructureNodeResponse(ToNodeDto(existing), null);
    }

    public async Task<StructureNodeDto> UpdateNodeAsync(
        Actor actor,
        Guid nodeId,
        string name,
        string? unitNumber,
        Guid? leaderMemberId,
        NewStructureNodeLeaderRequest? newLeader,
        bool clearLeader = false,
        CancellationToken ct = default)
    {
        RequireChurchManager(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var node = await db.StructureNodes
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Node not found in your church");

        var layer = template.Layers.Single(l => l.Id == node.LayerId);
        node.Name = name.Trim();
        node.UnitNumber = NormalizeUnitNumber(unitNumber);

        if (clearLeader)
            await ApplyNodeLeaderAsync(churchId, template, node, layer, null, null, ct);
        else if (leaderMemberId is not null || newLeader is not null)
            await ApplyNodeLeaderAsync(churchId, template, node, layer, leaderMemberId, newLeader, ct);
        await SaveStructureChangesAsync(churchId, ct);

        await db.Entry(node).Reference(n => n.Leader).LoadAsync(ct);
        return ToNodeDto(node);
    }

    public async Task DeleteNodeAsync(Actor actor, Guid nodeId, CancellationToken ct = default)
    {
        RequireChurchManager(actor);
        var churchId = RequireStructureChurch(actor);

        var node = await db.StructureNodes
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Node not found in your church");

        var subtreeIds = await CollectSubtreeNodeIdsAsync(churchId, nodeId, ct);

        var members = await db.ChurchMembers
            .Where(m => m.ChurchId == churchId && subtreeIds.Contains(m.ParentNodeId))
            .ToListAsync(ct);
        if (members.Count > 0)
        {
            db.ChurchMembers.RemoveRange(members);
            await SaveStructureChangesAsync(churchId, ct);
        }

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");
        var layerOrder = template.Layers.ToDictionary(l => l.Id, l => l.SortOrder);

        var nodes = await db.StructureNodes
            .Where(n => n.ChurchId == churchId && subtreeIds.Contains(n.Id))
            .ToListAsync(ct);

        foreach (var toDelete in nodes.OrderByDescending(n => layerOrder[n.LayerId]))
            db.StructureNodes.Remove(toDelete);

        await SaveStructureChangesAsync(churchId, ct);
    }

    public async Task<StructureNodeDto> CreateNodeAsync(
        Actor actor,
        Guid layerId,
        Guid? parentNodeId,
        string name,
        CancellationToken ct = default)
    {
        var result = await CreateNodeAsync(actor, layerId, parentNodeId, name, null, null, null, ct: ct);
        return result.Node;
    }

    public async Task<StructureNodeDto> LinkNodeAsync(
        Actor actor,
        Guid nodeId,
        Guid? parentNodeId,
        CancellationToken ct = default)
    {
        RequireChurchManager(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var node = await db.StructureNodes
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Node not found in your church");

        var layer = template.Layers.Single(l => l.Id == node.LayerId);
        await ValidateNodeParentAsync(churchId, layer, parentNodeId, ct, nodeId);

        node.ParentNodeId = parentNodeId;
        await SaveStructureChangesAsync(churchId, ct);

        await db.Entry(node).Reference(n => n.Leader).LoadAsync(ct);
        return ToNodeDto(node);
    }

    public static StructureNodeDto ToNodeDto(
        StructureNode node,
        IReadOnlyDictionary<Guid, string>? memberNames = null) =>
        new(
            node.Id,
            node.LayerId,
            node.ParentNodeId,
            node.Name,
            node.UnitNumber,
            node.LeaderMemberId,
            ResolveLeaderName(node, memberNames));

    private static string? ResolveLeaderName(
        StructureNode node,
        IReadOnlyDictionary<Guid, string>? memberNames)
    {
        if (!string.IsNullOrWhiteSpace(node.Leader?.Name))
            return node.Leader.Name;

        if (node.LeaderMemberId is not null &&
            memberNames is not null &&
            memberNames.TryGetValue(node.LeaderMemberId.Value, out var name))
            return name;

        return null;
    }

    private static string? NormalizeUnitNumber(string? unitNumber)
    {
        var trimmed = unitNumber?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private async Task<string> NextUnitNumberAsync(
        Guid churchId,
        Guid layerId,
        Guid? parentNodeId,
        CancellationToken ct)
    {
        var siblings = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && n.LayerId == layerId && n.ParentNodeId == parentNodeId)
            .Select(n => n.UnitNumber)
            .ToListAsync(ct);

        var maxNumeric = 0;
        foreach (var unitNumber in siblings)
        {
            if (int.TryParse(unitNumber, out var parsed) && parsed > maxNumeric)
                maxNumeric = parsed;
        }

        return (Math.Max(maxNumeric, siblings.Count) + 1).ToString();
    }

    private static MemberPosition LeaderPositionForLayer(StructureLayerType type) =>
        type switch
        {
            StructureLayerType.PFCC => MemberPosition.PfccManager,
            StructureLayerType.Fellowship => MemberPosition.FellowshipLeader,
            StructureLayerType.Cell => MemberPosition.CellLeader,
            _ => MemberPosition.Member,
        };

    private async Task<GeneratedLeaderLoginDto?> ApplyNodeLeaderAsync(
        Guid churchId,
        StructureTemplate template,
        StructureNode node,
        StructureLayer layer,
        Guid? leaderMemberId,
        NewStructureNodeLeaderRequest? newLeader,
        CancellationToken ct,
        bool sendInviteEmail = true)
    {
        if (leaderMemberId is null && newLeader is null)
        {
            node.LeaderMemberId = null;
            return null;
        }

        if (leaderMemberId is not null && newLeader is not null)
            throw new BadRequestException("Choose an existing leader or create a new one, not both");

        var deepestLayer = template.Layers.OrderByDescending(l => l.SortOrder).First();
        var leaderPosition = LeaderPositionForLayer(layer.StandardType);

        if (newLeader is not null)
        {
            if (string.IsNullOrWhiteSpace(newLeader.Name))
                throw new BadRequestException("Leader name is required");
            if (string.IsNullOrWhiteSpace(newLeader.Email))
                throw new BadRequestException("Leader email is required");
            if (string.IsNullOrWhiteSpace(newLeader.Phone))
                throw new BadRequestException("Leader phone is required");
            if (newLeader.DateOfBirth is null)
                throw new BadRequestException("Leader date of birth is required");
            if (!newLeader.LeaderIsCellLeader)
                throw new BadRequestException(
                    "The fellowship leader must lead their first cell. Confirm they are the cell leader to continue.");

            Guid memberParentNodeId;
            StructureNode? autoCell = null;
            if (layer.Id == deepestLayer.Id)
            {
                memberParentNodeId = node.Id;
            }
            else
            {
                var cellName = string.IsNullOrWhiteSpace(newLeader.InitialCellName)
                    ? $"{node.Name.Trim()} Cell"
                    : newLeader.InitialCellName.Trim();
                autoCell = new StructureNode
                {
                    ChurchId = churchId,
                    LayerId = deepestLayer.Id,
                    ParentNodeId = node.Id,
                    Name = cellName,
                    UnitNumber = await NextUnitNumberAsync(churchId, deepestLayer.Id, node.Id, ct),
                };
                db.StructureNodes.Add(autoCell);
                await SaveStructureChangesAsync(churchId, ct);
                memberParentNodeId = autoCell.Id;
            }

            var member = new Member
            {
                ChurchId = churchId,
                ParentNodeId = memberParentNodeId,
                Name = newLeader.Name.Trim(),
                Position = leaderPosition,
            };
            StructureMemberService.ApplyMemberProfile(
                member,
                newLeader.Phone,
                newLeader.DateOfBirth,
                newLeader.Residence,
                newLeader.State,
                StructureMemberService.ParseMemberOccupationStatus(newLeader.OccupationStatus),
                newLeader.SchoolOrWorkplace,
                newLeader.Workplace);

            GeneratedLeaderLoginDto? generatedLogin = null;
            var authUserId = await leaderAccounts.ProvisionLoginAsync(
                churchId,
                node.Id,
                layer.StandardType,
                member,
                newLeader.Email,
                ct);
            generatedLogin = new GeneratedLeaderLoginDto(newLeader.Email.Trim());

            if (autoCell is not null)
            {
                autoCell.LeaderMemberId = member.Id;
                leaderAccounts.AssignLeaderRole(
                    churchId,
                    authUserId,
                    ChurchRole.CellLeader,
                    autoCell.Id);
            }

            db.ChurchMembers.Add(member);
            await SaveStructureChangesAsync(churchId, ct);
            node.LeaderMemberId = member.Id;

            if (generatedLogin is not null && sendInviteEmail)
                await SendLeaderSetPasswordEmailAsync(
                    churchId,
                    layer,
                    node.Name,
                    newLeader.Name.Trim(),
                    authUserId,
                    generatedLogin.Email,
                    ct);

            return generatedLogin;
        }

        var existingLeader = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == leaderMemberId && m.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Leader not found in your church");

        if (!await IsMemberUnderNodeAsync(churchId, node.Id, existingLeader.ParentNodeId, ct))
            throw new BadRequestException("Leader must belong under this unit");

        existingLeader.Position = leaderPosition;
        node.LeaderMemberId = existingLeader.Id;
        return null;
    }

    private async Task SendLeaderSetPasswordEmailAsync(
        Guid churchId,
        StructureLayer layer,
        string unitName,
        string leaderName,
        Guid authUserId,
        string emailAddress,
        CancellationToken ct)
    {
        var church = await db.StructureChurches.AsNoTracking()
            .SingleAsync(c => c.Id == churchId, ct);

        var token = await auth.CreateSetPasswordTokenAsync(authUserId, ct);
        var setPasswordUrl = $"{emailOptions.Value.FrontendBaseUrl.TrimEnd('/')}/set-password?token={token}";
        var roleTitle = $"{layer.DisplayName} leader";
        var (subject, body) = EmailTemplates.LeaderSetPasswordInvite(
            leaderName,
            church.Name,
            roleTitle,
            unitName.Trim(),
            setPasswordUrl);

        await email.SendAsync(emailAddress, subject, body, ct);
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

    private async Task<bool> IsMemberUnderNodeAsync(
        Guid churchId,
        Guid nodeId,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        if (memberParentNodeId == nodeId)
            return true;

        var current = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == memberParentNodeId && n.ChurchId == churchId, ct);
        while (current is not null)
        {
            if (current.Id == nodeId)
                return true;
            if (current.ParentNodeId is null)
                return false;
            current = await db.StructureNodes.AsNoTracking()
                .SingleOrDefaultAsync(n => n.Id == current.ParentNodeId && n.ChurchId == churchId, ct);
        }

        return false;
    }

    private async Task ValidateNodeParentAsync(
        Guid churchId,
        StructureLayer layer,
        Guid? parentNodeId,
        CancellationToken ct,
        Guid? excludeNodeId = null)
    {
        if (layer.SortOrder == 0)
        {
            if (parentNodeId is not null)
                throw new BadRequestException("Top-level nodes must sit directly under the church");
            return;
        }

        if (parentNodeId is null)
            throw new BadRequestException("Parent node is required for this layer");

        var template = layer.Template
            ?? await db.StructureLayers.AsNoTracking()
                .Include(l => l.Template!.Layers)
                .Where(l => l.Id == layer.Id)
                .Select(l => l.Template!)
                .SingleAsync(ct);

        var parentLayer = template.Layers.Single(l => l.SortOrder == layer.SortOrder - 1);
        var parentNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == parentNodeId && n.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Parent node not found in your church");

        if (parentNode.LayerId != parentLayer.Id)
            throw new BadRequestException("Parent node must belong to the previous layer");

        if (excludeNodeId is not null && parentNodeId == excludeNodeId)
            throw new BadRequestException("A node cannot be its own parent");
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

    private void RequireChurchManager(Actor actor)
    {
        if (!givingScope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor or church admin can manage church structure");
    }
}
