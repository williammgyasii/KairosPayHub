using KairosPayHub.Api.Authorization;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Authorization;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class LayerAccessService(
    KairosDbContext db,
    AbilityResolver abilities,
    GivingScopeService givingScope)
{
    static readonly IReadOnlyDictionary<string, string> AbilityLabels = new Dictionary<string, string>(
        StringComparer.Ordinal)
    {
        [ProductAbilities.CreateChildUnits] = "Create child units",
        [ProductAbilities.ManageRoster] = "Manage members",
        [ProductAbilities.ViewMemberGivings] = "View member givings",
        [ProductAbilities.LogGiving] = "Log giving",
        [ProductAbilities.ApproveGiving] = "Approve giving",
        [ProductAbilities.ViewOverallGivings] = "View overall givings",
        [ProductAbilities.CreateCampaign] = "Create campaign",
        [ProductAbilities.CreateSubCampaign] = "Create sub-campaign",
    };

    public async Task<IReadOnlyCollection<string>> DisabledAbilitiesForAsync(
        Actor actor,
        Guid authUserId,
        Guid? scopeLayerId,
        CancellationToken ct)
    {
        if (actor.StructureRole == ChurchRole.Pastor || actor.StructureChurchId == default)
            return [];

        var churchId = actor.StructureChurchId;
        var overlays = await db.ChurchAbilityOverlays.AsNoTracking()
            .Where(o => o.ChurchId == churchId && !o.Enabled)
            .ToListAsync(ct);

        var disabled = new HashSet<string>(StringComparer.Ordinal);
        if (actor.StructureRole == ChurchRole.ChurchAdmin)
        {
            foreach (var row in overlays.Where(o => o.SubjectKind == AbilityOverlaySubjectKind.AdminProfile))
                disabled.Add(row.Ability);
            foreach (var row in overlays.Where(o =>
                         o.SubjectKind == AbilityOverlaySubjectKind.AdminUser && o.SubjectId == authUserId))
                disabled.Add(row.Ability);
            return disabled;
        }

        if (scopeLayerId is Guid layerId)
        {
            foreach (var row in overlays.Where(o =>
                         o.SubjectKind == AbilityOverlaySubjectKind.Layer && o.SubjectId == layerId))
                disabled.Add(row.Ability);
        }

        return disabled;
    }

    public async Task<AbilityResolution> ResolveForAsync(Actor actor, Guid authUserId, CancellationToken ct)
    {
        Guid? scopeLayerId = null;
        StructureLayerType? layerKind = null;
        if (authUserId != Guid.Empty && actor.StructureChurchId != default)
        {
            var scoped = await (
                from assignment in db.RoleAssignments.AsNoTracking()
                join node in db.StructureNodes.AsNoTracking() on assignment.ScopeNodeId equals node.Id
                join layer in db.StructureLayers.AsNoTracking() on node.LayerId equals layer.Id
                where assignment.ChurchId == actor.StructureChurchId
                    && assignment.AuthUserId == authUserId
                    && assignment.Role == actor.StructureRole
                    && assignment.ScopeNodeId != null
                select new { layer.Id, layer.StandardType })
                .FirstOrDefaultAsync(ct);
            if (scoped is not null)
            {
                scopeLayerId = scoped.Id;
                layerKind = scoped.StandardType;
            }
        }

        var disabled = await DisabledAbilitiesForAsync(actor, authUserId, scopeLayerId, ct);
        return abilities.Resolve(actor.StructureRole, layerKind, disabled);
    }

    public async Task EnsureCanManageRosterAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct)
    {
        if (givingScope.CanManageChurch(actor) || actor.StructureRole == ChurchRole.Pastor)
            return;

        var resolved = await ResolveForAsync(actor, authUserId, ct);
        if (!resolved.Abilities.Contains(ProductAbilities.ManageRoster, StringComparer.Ordinal))
            throw new ForbiddenException("You cannot manage members");
    }

    public async Task EnsureCanCreateNodeAsync(
        Actor actor,
        Guid authUserId,
        Guid layerId,
        Guid? parentNodeId,
        IEnumerable<StructureLayer> layers,
        CancellationToken ct)
    {
        if (authUserId == Guid.Empty)
            throw new ForbiddenException("You cannot create units");

        var resolved = await ResolveForAsync(actor, authUserId, ct);
        if (!resolved.Abilities.Contains(ProductAbilities.CreateChildUnits, StringComparer.Ordinal))
            throw new ForbiddenException("You cannot create units");

        var churchWide = givingScope.CanManageChurch(actor);
        if (churchWide)
            return;

        var scopeNodeId = await givingScope.GetActorScopeNodeIdAsync(actor, authUserId, ct)
            ?? throw new ForbiddenException("You cannot create units");

        var scopeNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == scopeNodeId && n.ChurchId == actor.StructureChurchId, ct)
            ?? throw new ForbiddenException("You cannot create units");

        var layerList = layers.ToList();
        var scopeLayer = layerList.SingleOrDefault(l => l.Id == scopeNode.LayerId)
            ?? throw new ForbiddenException("You cannot create units");
        var targetLayer = layerList.SingleOrDefault(l => l.Id == layerId)
            ?? throw new BadRequestException("Layer not found in your structure template");

        if (targetLayer.SortOrder != scopeLayer.SortOrder + 1)
            throw new ForbiddenException("You can only create units on the next layer down");

        if (parentNodeId is not Guid parentId)
            throw new ForbiddenException("A parent in your unit is required");

        if (!await givingScope.IsNodeInSubtreeAsync(actor.StructureChurchId, scopeNodeId, parentId, ct))
            throw new ForbiddenException("You can only create units inside your unit");
    }

    public async Task EnsureCanDeleteNodeAsync(
        Actor actor,
        Guid authUserId,
        Guid nodeId,
        IEnumerable<StructureLayer> layers,
        CancellationToken ct)
    {
        if (authUserId == Guid.Empty)
            throw new ForbiddenException("You cannot delete units");

        var resolved = await ResolveForAsync(actor, authUserId, ct);
        if (!resolved.Abilities.Contains(ProductAbilities.CreateChildUnits, StringComparer.Ordinal))
            throw new ForbiddenException("You cannot delete units");

        if (givingScope.CanManageChurch(actor))
            return;

        var scopeNodeId = await givingScope.GetActorScopeNodeIdAsync(actor, authUserId, ct)
            ?? throw new ForbiddenException("You cannot delete units");
        if (nodeId == scopeNodeId)
            throw new ForbiddenException("You cannot delete your own unit");

        var churchId = actor.StructureChurchId;
        var node = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("You cannot delete units");

        var scopeNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == scopeNodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("You cannot delete units");

        var layerList = layers.ToList();
        var scopeLayer = layerList.SingleOrDefault(l => l.Id == scopeNode.LayerId)
            ?? throw new ForbiddenException("You cannot delete units");
        var targetLayer = layerList.SingleOrDefault(l => l.Id == node.LayerId)
            ?? throw new ForbiddenException("You cannot delete units");

        if (targetLayer.SortOrder != scopeLayer.SortOrder + 1)
            throw new ForbiddenException("You can only delete units on the next layer down");

        if (!await givingScope.IsNodeInSubtreeAsync(churchId, scopeNodeId, nodeId, ct))
            throw new ForbiddenException("You can only delete units inside your unit");
    }

    public async Task<AccessGridResponse> GetGridAsync(Actor actor, CancellationToken ct)
    {
        RequirePastor(actor);
        var churchId = RequireChurch(actor);
        var template = await db.StructureTemplates
            .AsNoTracking()
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Define the structure template first");

        var layers = template.Layers.OrderBy(l => l.SortOrder).ToList();
        var deepestId = layers.LastOrDefault()?.Id;
        var overlays = await db.ChurchAbilityOverlays.AsNoTracking()
            .Where(o => o.ChurchId == churchId)
            .ToListAsync(ct);
        var admins = await db.ChurchAdministrators.AsNoTracking()
            .Where(a => a.ChurchId == churchId && a.IsActive)
            .OrderBy(a => a.LastName)
            .ThenBy(a => a.FirstName)
            .ToListAsync(ct);

        var columns = ProductAbilities.Editable
            .Select(id => new AccessAbilityColumnDto(id, AbilityLabels[id]))
            .ToList();

        var rows = new List<AccessRowDto>();
        foreach (var layer in layers)
        {
            var defaults = DefaultsForLayer(layer, deepestId);
            rows.Add(new AccessRowDto(
                "layer",
                layer.Id,
                layer.DisplayName,
                CellsFor(defaults, overlays, AbilityOverlaySubjectKind.Layer, layer.Id, layer.Id == deepestId)));
        }

        var adminDefaults = DefaultsForProfile(LeadershipProfileKind.ChurchWide);
        rows.Add(new AccessRowDto(
            "adminProfile",
            null,
            "Administrators",
            CellsFor(adminDefaults, overlays, AbilityOverlaySubjectKind.AdminProfile, null, false)));

        foreach (var admin in admins)
        {
            rows.Add(new AccessRowDto(
                "adminUser",
                admin.AuthUserId,
                admin.FullName,
                CellsFor(
                    EffectiveMap(adminDefaults, overlays, AbilityOverlaySubjectKind.AdminProfile, null),
                    overlays,
                    AbilityOverlaySubjectKind.AdminUser,
                    admin.AuthUserId,
                    false)));
        }

        return new AccessGridResponse(columns, rows);
    }

    public async Task SaveAsync(Actor actor, SaveAccessRequest request, CancellationToken ct)
    {
        RequirePastor(actor);
        var churchId = RequireChurch(actor);
        var changes = request.Changes ?? [];
        var template = await db.StructureTemplates
            .AsNoTracking()
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Define the structure template first");
        var deepestId = template.Layers.OrderBy(l => l.SortOrder).LastOrDefault()?.Id;
        var overlays = await db.ChurchAbilityOverlays
            .Where(o => o.ChurchId == churchId)
            .ToListAsync(ct);

        var profileOff = overlays
            .Where(o => o.SubjectKind == AbilityOverlaySubjectKind.AdminProfile && !o.Enabled)
            .Select(o => o.Ability)
            .ToHashSet(StringComparer.Ordinal);

        foreach (var change in changes)
        {
            if (!ProductAbilities.Editable.Contains(change.Ability, StringComparer.Ordinal))
                throw new BadRequestException("That ability cannot be set here");

            var kind = ParseKind(change.SubjectKind);
            if (kind == AbilityOverlaySubjectKind.AdminUser
                && change.Enabled
                && (profileOff.Contains(change.Ability)
                    || changes.Any(c =>
                        ParseKind(c.SubjectKind) == AbilityOverlaySubjectKind.AdminProfile
                        && c.Ability == change.Ability
                        && !c.Enabled)))
            {
                throw new BadRequestException("An administrator cannot have more access than the Administrators profile");
            }

            if (kind == AbilityOverlaySubjectKind.Layer
                && change.SubjectId == deepestId
                && change.Ability == ProductAbilities.CreateChildUnits
                && change.Enabled)
            {
                throw new BadRequestException("The deepest layer cannot create child units");
            }

            var subjectId = kind == AbilityOverlaySubjectKind.AdminProfile ? null : change.SubjectId;
            var existing = overlays.FirstOrDefault(o =>
                o.SubjectKind == kind
                && o.SubjectId == subjectId
                && o.Ability == change.Ability);

            var defaults = kind == AbilityOverlaySubjectKind.Layer
                ? DefaultsForLayer(template.Layers.Single(l => l.Id == change.SubjectId), deepestId)
                : DefaultsForProfile(LeadershipProfileKind.ChurchWide);
            if (kind == AbilityOverlaySubjectKind.AdminUser)
                defaults = EffectiveMap(defaults, overlays, AbilityOverlaySubjectKind.AdminProfile, null);

            var defaultOn = defaults.GetValueOrDefault(change.Ability);
            if (change.Enabled == defaultOn)
            {
                if (existing is not null)
                    db.ChurchAbilityOverlays.Remove(existing);
                continue;
            }

            if (existing is null)
            {
                var row = new ChurchAbilityOverlay
                {
                    ChurchId = churchId,
                    SubjectKind = kind,
                    SubjectId = subjectId,
                    Ability = change.Ability,
                    Enabled = change.Enabled,
                };
                db.ChurchAbilityOverlays.Add(row);
                overlays.Add(row);
            }
            else
            {
                existing.Enabled = change.Enabled;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    static Dictionary<string, bool> DefaultsForLayer(StructureLayer layer, Guid? deepestId)
    {
        var profile = layer.Id == deepestId
            ? LeadershipProfileKind.Leaf
            : layer.SortOrder == 0 && layer.StandardType is StructureLayerType.Cell
                ? LeadershipProfileKind.Leaf
                : LeadershipProfileKind.Intermediate;
        return DefaultsForProfile(profile);
    }

    static Dictionary<string, bool> DefaultsForProfile(LeadershipProfileKind profile)
    {
        var granted = LayerLeadershipProfiles.AbilitiesFor(profile)
            .ToHashSet(StringComparer.Ordinal);
        return ProductAbilities.Editable.ToDictionary(
            id => id,
            id => granted.Contains(id),
            StringComparer.Ordinal);
    }

    static Dictionary<string, bool> EffectiveMap(
        Dictionary<string, bool> defaults,
        IReadOnlyCollection<ChurchAbilityOverlay> overlays,
        AbilityOverlaySubjectKind kind,
        Guid? subjectId)
    {
        var map = new Dictionary<string, bool>(defaults, StringComparer.Ordinal);
        foreach (var row in overlays.Where(o => o.SubjectKind == kind && o.SubjectId == subjectId))
            map[row.Ability] = row.Enabled;
        return map;
    }

    static IReadOnlyList<AccessCellDto> CellsFor(
        Dictionary<string, bool> defaults,
        IReadOnlyCollection<ChurchAbilityOverlay> overlays,
        AbilityOverlaySubjectKind kind,
        Guid? subjectId,
        bool lockCreateChild)
    {
        var effective = EffectiveMap(defaults, overlays, kind, subjectId);
        return ProductAbilities.Editable.Select(id =>
        {
            var defaultOn = defaults.GetValueOrDefault(id);
            var locked = lockCreateChild && id == ProductAbilities.CreateChildUnits;
            var on = locked ? false : effective.GetValueOrDefault(id);
            return new AccessCellDto(id, defaultOn, on, locked);
        }).ToList();
    }

    static AbilityOverlaySubjectKind ParseKind(string kind) =>
        kind.ToLowerInvariant() switch
        {
            "layer" => AbilityOverlaySubjectKind.Layer,
            "adminprofile" => AbilityOverlaySubjectKind.AdminProfile,
            "adminuser" => AbilityOverlaySubjectKind.AdminUser,
            _ => throw new BadRequestException("Unknown access subject"),
        };

    static void RequirePastor(Actor actor)
    {
        if (actor.StructureRole != ChurchRole.Pastor)
            throw new ForbiddenException("Only the pastor can manage access");
    }

    static Guid RequireChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }
}
