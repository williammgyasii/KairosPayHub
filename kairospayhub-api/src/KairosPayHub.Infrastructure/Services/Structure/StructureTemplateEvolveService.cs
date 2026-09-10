using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Structure template evolve operations (rename / insert / appendBeforeMember).
/// </summary>
public class StructureTemplateEvolveService(
    KairosDbContext db,
    GivingScopeService givingScope,
    ChurchReadCache readCache)
{
    public async Task<EvolveStructureTemplateResponse> EvolveTemplateAsync(
        Actor actor,
        EvolveStructureTemplateRequest request,
        CancellationToken ct = default)
    {
        RequireChurchManager(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await db.StructureTemplates
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct)
            ?? throw new BadRequestException("Define the structure template before evolving it");

        var operation = request.Operation?.Trim().ToLowerInvariant()
            ?? throw new BadRequestException("Operation is required");

        return operation switch
        {
            "rename" => await EvolveRenameAsync(template, request, ct),
            "appendtop" => await EvolveInsertLayerAsync(template, churchId, insertAt: 0, request, ct),
            "insertat" => await EvolveInsertLayerAsync(
                template,
                churchId,
                request.AtSortOrder
                    ?? throw new BadRequestException("AtSortOrder is required for insertAt"),
                request,
                ct),
            "appendbeforemember" => await EvolveAppendBeforeMemberAsync(template, churchId, request, ct),
            _ => throw new BadRequestException(
                "Unknown operation. Use rename, appendTop, insertAt, or appendBeforeMember."),
        };
    }

    private async Task<EvolveStructureTemplateResponse> EvolveRenameAsync(
        StructureTemplate template,
        EvolveStructureTemplateRequest request,
        CancellationToken ct)
    {
        var existingLayers = template.Layers.OrderBy(l => l.SortOrder).ToList();
        var inputs = request.Layers
            ?? throw new BadRequestException("Layers are required for rename");

        if (inputs.Count != existingLayers.Count)
            throw new BadRequestException("Rename must include the same number of layers as the current template");

        var details = new List<string>();
        for (var i = 0; i < existingLayers.Count; i++)
        {
            var existing = existingLayers[i];
            var input = inputs[i];
            var inputType = StructureTemplateService.ParseLayerType(input.StandardType);
            if (inputType != existing.StandardType)
            {
                throw new BadRequestException(
                    "Rename cannot change layer types or order. Use insertAt or appendTop to add layers.");
            }

            if (existing.DisplayName != input.DisplayName.Trim())
            {
                details.Add($"{existing.DisplayName} → {input.DisplayName.Trim()}");
            }
        }

        var templateName = request.Name is null ? template.Name : StructureTemplateService.NormalizeTemplateName(request.Name);
        if (templateName != template.Name)
            details.Insert(0, $"Structure name → {templateName}");

        var preview = new StructureEvolvePreviewDto(
            details.Count == 0
                ? "No display name changes."
                : $"Update {details.Count} label(s). Roster nodes and members are unchanged.",
            BridgeNodesCreated: 0,
            NodesReparented: 0,
            MembersMoved: 0,
            details);

        if (request.DryRun)
        {
            return new EvolveStructureTemplateResponse(
                StructureTemplateService.ToTemplateDto(template),
                preview,
                Applied: false);
        }

        template.Name = templateName;
        for (var i = 0; i < existingLayers.Count; i++)
            existingLayers[i].DisplayName = inputs[i].DisplayName.Trim();

        await SaveStructureChangesAsync(template.ChurchId, ct);

        var loaded = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleAsync(t => t.Id == template.Id, ct);

        return new EvolveStructureTemplateResponse(StructureTemplateService.ToTemplateDto(loaded), preview, Applied: true);
    }

    private async Task<EvolveStructureTemplateResponse> EvolveInsertLayerAsync(
        StructureTemplate template,
        Guid churchId,
        int insertAt,
        EvolveStructureTemplateRequest request,
        CancellationToken ct)
    {
        var layerInput = request.Layer
            ?? throw new BadRequestException("Layer is required for appendTop and insertAt");

        var orderedLayers = template.Layers.OrderBy(l => l.SortOrder).ToList();
        if (insertAt < 0 || insertAt > orderedLayers.Count)
        {
            throw new BadRequestException(
                $"Insert position must be between 0 and {orderedLayers.Count}");
        }

        if (insertAt == orderedLayers.Count)
        {
            throw new BadRequestException(
                "Use insertAt before the deepest layer. The deepest org layer must remain Cell.");
        }

        var proposedLayers = new List<StructureLayerInput>();
        for (var i = 0; i < orderedLayers.Count; i++)
        {
            if (i == insertAt)
                proposedLayers.Add(layerInput);
            proposedLayers.Add(new StructureLayerInput(
                orderedLayers[i].StandardType.ToString(),
                orderedLayers[i].DisplayName));
        }

        StructureTemplateService.ValidateLayerInputs(proposedLayers);

        var nodes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId)
            .ToListAsync(ct);

        var memberCount = await db.ChurchMembers.CountAsync(m => m.ChurchId == churchId, ct);
        var preview = BuildInsertPreview(orderedLayers, insertAt, layerInput, nodes, memberCount);

        if (request.DryRun)
        {
            return new EvolveStructureTemplateResponse(
                StructureTemplateService.ToTemplateDto(template),
                preview,
                Applied: false);
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Bump highest sort orders first to avoid (TemplateId, SortOrder) unique index collisions.
        foreach (var layer in orderedLayers.Where(l => l.SortOrder >= insertAt).OrderByDescending(l => l.SortOrder))
        {
            var nextSort = layer.SortOrder + 1;
            await db.StructureLayers
                .Where(l => l.Id == layer.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.SortOrder, nextSort), ct);
        }

        foreach (var layer in orderedLayers)
        {
            var entry = db.Entry(layer);
            if (entry.State != EntityState.Detached)
                entry.State = EntityState.Detached;
        }

        var newLayer = new StructureLayer
        {
            TemplateId = template.Id,
            SortOrder = insertAt,
            StandardType = StructureTemplateService.ParseLayerType(layerInput.StandardType),
            DisplayName = layerInput.DisplayName.Trim(),
        };
        db.StructureLayers.Add(newLayer);
        await SaveStructureChangesAsync(churchId, ct);

        var newLayerEntry = db.Entry(newLayer);
        if (newLayerEntry.State != EntityState.Detached)
            newLayerEntry.State = EntityState.Detached;

        var childLayer = orderedLayers[insertAt];
        var bridgeNodesCreated = 0;
        var nodesReparented = 0;
        var nodeReparentings = new List<(Guid NodeId, Guid BridgeId)>();

        if (insertAt == 0)
        {
            var rootNodes = nodes
                .Where(n => n.LayerId == childLayer.Id && n.ParentNodeId is null)
                .ToList();

            foreach (var root in rootNodes)
            {
                var bridge = new StructureNode
                {
                    ChurchId = churchId,
                    LayerId = newLayer.Id,
                    ParentNodeId = null,
                    Name = BridgeNodeName(newLayer.DisplayName, root.Name),
                    UnitNumber = await NextUnitNumberAsync(churchId, newLayer.Id, null, ct),
                };
                db.StructureNodes.Add(bridge);
                nodeReparentings.Add((root.Id, bridge.Id));
                bridgeNodesCreated += 1;
                nodesReparented += 1;
            }
        }
        else
        {
            var parentLayer = orderedLayers[insertAt - 1];
            var parentNodes = nodes.Where(n => n.LayerId == parentLayer.Id).ToList();

            foreach (var parent in parentNodes)
            {
                var children = nodes
                    .Where(n => n.LayerId == childLayer.Id && n.ParentNodeId == parent.Id)
                    .ToList();
                if (children.Count == 0)
                    continue;

                var bridge = new StructureNode
                {
                    ChurchId = churchId,
                    LayerId = newLayer.Id,
                    ParentNodeId = parent.Id,
                    Name = BridgeNodeName(newLayer.DisplayName, parent.Name),
                    UnitNumber = await NextUnitNumberAsync(churchId, newLayer.Id, parent.Id, ct),
                };
                db.StructureNodes.Add(bridge);
                bridgeNodesCreated += 1;

                foreach (var child in children)
                {
                    nodeReparentings.Add((child.Id, bridge.Id));
                    nodesReparented += 1;
                }
            }
        }

        if (request.Name is not null)
            template.Name = StructureTemplateService.NormalizeTemplateName(request.Name);

        DetachNonAddedStructureLayers(newLayer.Id);
        await SaveStructureChangesAsync(churchId, ct);

        foreach (var (nodeId, bridgeId) in nodeReparentings)
        {
            await db.StructureNodes
                .Where(n => n.Id == nodeId && n.ChurchId == churchId)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.ParentNodeId, bridgeId), ct);
        }

        await tx.CommitAsync(ct);

        var loaded = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleAsync(t => t.Id == template.Id, ct);

        var appliedPreview = preview with { Summary = $"{preview.Summary} Applied." };
        return new EvolveStructureTemplateResponse(StructureTemplateService.ToTemplateDto(loaded), appliedPreview, Applied: true);
    }

    private async Task<EvolveStructureTemplateResponse> EvolveAppendBeforeMemberAsync(
        StructureTemplate template,
        Guid churchId,
        EvolveStructureTemplateRequest request,
        CancellationToken ct)
    {
        var layerInput = request.Layer
            ?? throw new BadRequestException("Layer is required for appendBeforeMember");

        var orderedLayers = template.Layers.OrderBy(l => l.SortOrder).ToList();
        var oldDeepest = orderedLayers[^1];

        var proposedLayers = orderedLayers
            .Select(l => new StructureLayerInput(l.StandardType.ToString(), l.DisplayName))
            .ToList();
        proposedLayers.Add(layerInput);
        StructureTemplateService.ValidateLayerInputs(proposedLayers);

        var nodes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId)
            .ToListAsync(ct);

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId)
            .ToListAsync(ct);

        var oldDeepestNodes = nodes.Where(n => n.LayerId == oldDeepest.Id).ToList();
        var preview = BuildAppendBeforeMemberPreview(
            orderedLayers,
            layerInput,
            oldDeepest,
            oldDeepestNodes,
            members);

        if (request.DryRun)
        {
            return new EvolveStructureTemplateResponse(
                StructureTemplateService.ToTemplateDto(template),
                preview,
                Applied: false);
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        foreach (var layer in orderedLayers)
        {
            var entry = db.Entry(layer);
            if (entry.State != EntityState.Detached)
                entry.State = EntityState.Detached;
        }

        var newLayer = new StructureLayer
        {
            TemplateId = template.Id,
            SortOrder = orderedLayers.Count,
            StandardType = StructureTemplateService.ParseLayerType(layerInput.StandardType),
            DisplayName = layerInput.DisplayName.Trim(),
        };
        db.StructureLayers.Add(newLayer);

        var membersMoved = 0;
        var bridgeNodesCreated = 0;
        var memberReparentings = new List<(Guid MemberId, Guid BridgeId)>();

        foreach (var parent in oldDeepestNodes)
        {
            var nodeMembers = members.Where(m => m.ParentNodeId == parent.Id).ToList();
            if (nodeMembers.Count == 0)
                continue;

            var bridge = new StructureNode
            {
                ChurchId = churchId,
                LayerId = newLayer.Id,
                ParentNodeId = parent.Id,
                Name = BridgeNodeName(newLayer.DisplayName, parent.Name),
                UnitNumber = await NextUnitNumberAsync(churchId, newLayer.Id, parent.Id, ct),
            };
            db.StructureNodes.Add(bridge);
            bridgeNodesCreated += 1;

            foreach (var member in nodeMembers)
            {
                memberReparentings.Add((member.Id, bridge.Id));
                membersMoved += 1;
            }
        }

        if (request.Name is not null)
            template.Name = StructureTemplateService.NormalizeTemplateName(request.Name);

        DetachNonAddedStructureLayers(newLayer.Id);
        await SaveStructureChangesAsync(churchId, ct);

        foreach (var (memberId, bridgeId) in memberReparentings)
        {
            await db.ChurchMembers
                .Where(m => m.Id == memberId)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.ParentNodeId, bridgeId), ct);
        }

        await tx.CommitAsync(ct);

        var loaded = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleAsync(t => t.Id == template.Id, ct);

        var appliedPreview = preview with
        {
            Summary = $"{preview.Summary} Applied.",
            BridgeNodesCreated = bridgeNodesCreated,
            MembersMoved = membersMoved,
        };
        return new EvolveStructureTemplateResponse(StructureTemplateService.ToTemplateDto(loaded), appliedPreview, Applied: true);
    }

    private static StructureEvolvePreviewDto BuildAppendBeforeMemberPreview(
        IReadOnlyList<StructureLayer> orderedLayers,
        StructureLayerInput layerInput,
        StructureLayer oldDeepest,
        IReadOnlyList<StructureNode> oldDeepestNodes,
        IReadOnlyList<Member> members)
    {
        var details = new List<string>();
        var bridgeNodesCreated = 0;
        var membersMoved = 0;

        foreach (var parent in oldDeepestNodes)
        {
            var nodeMembers = members.Where(m => m.ParentNodeId == parent.Id).ToList();
            if (nodeMembers.Count == 0)
                continue;

            bridgeNodesCreated += 1;
            membersMoved += nodeMembers.Count;
            details.Add(
                $"Under {oldDeepest.DisplayName} “{parent.Name}”: create {layerInput.DisplayName} and move {nodeMembers.Count} member(s).");
        }

        if (bridgeNodesCreated == 0)
        {
            details.Add(
                $"No members sit on {oldDeepest.DisplayName} yet. The new {layerInput.DisplayName} layer will appear in Roster when you add units.");
        }

        var chain = orderedLayers.Select(l => l.DisplayName).Append(layerInput.DisplayName).Append("Member");
        var summary =
            $"Add {layerInput.DisplayName} before members: {string.Join(" → ", chain)}. "
            + $"{bridgeNodesCreated} bridge node(s), {membersMoved} member(s) moved to the new deepest layer.";

        return new StructureEvolvePreviewDto(
            summary,
            bridgeNodesCreated,
            NodesReparented: 0,
            membersMoved,
            details);
    }

    private static StructureEvolvePreviewDto BuildInsertPreview(
        IReadOnlyList<StructureLayer> orderedLayers,
        int insertAt,
        StructureLayerInput layerInput,
        IReadOnlyList<StructureNode> nodes,
        int memberCount)
    {
        var details = new List<string>();
        var bridgeNodesCreated = 0;
        var nodesReparented = 0;

        if (insertAt == 0)
        {
            var childLayer = orderedLayers[0];
            var rootNodes = nodes
                .Where(n => n.LayerId == childLayer.Id && n.ParentNodeId is null)
                .ToList();
            bridgeNodesCreated = rootNodes.Count;
            nodesReparented = rootNodes.Count;
            details.Add(
                $"Create {bridgeNodesCreated} new {layerInput.DisplayName} node(s) under the church.");
            details.Add(
                $"Move {nodesReparented} {childLayer.DisplayName} node(s) under the new {layerInput.DisplayName} layer.");
        }
        else
        {
            var parentLayer = orderedLayers[insertAt - 1];
            var childLayer = orderedLayers[insertAt];
            foreach (var parent in nodes.Where(n => n.LayerId == parentLayer.Id))
            {
                var children = nodes
                    .Where(n => n.LayerId == childLayer.Id && n.ParentNodeId == parent.Id)
                    .ToList();
                if (children.Count == 0)
                    continue;

                bridgeNodesCreated += 1;
                nodesReparented += children.Count;
                details.Add(
                    $"Under {parentLayer.DisplayName} “{parent.Name}”: add {layerInput.DisplayName}, move {children.Count} {childLayer.DisplayName} node(s).");
            }

            if (bridgeNodesCreated == 0)
            {
                details.Add(
                    $"No {childLayer.DisplayName} nodes sit directly under a {parentLayer.DisplayName} yet. The new layer will appear when you add roster units.");
            }
        }

        var chainParts = new List<string>();
        for (var i = 0; i < insertAt; i++)
            chainParts.Add(orderedLayers[i].DisplayName);
        chainParts.Add(layerInput.DisplayName);
        for (var i = insertAt; i < orderedLayers.Count; i++)
            chainParts.Add(orderedLayers[i].DisplayName);

        var summary =
            $"Insert {layerInput.DisplayName} at position {insertAt + 1}: {string.Join(" → ", chainParts)} → Member. "
            + $"{bridgeNodesCreated} bridge node(s), {nodesReparented} node(s) re-parented, {memberCount} member(s) unchanged.";

        return new StructureEvolvePreviewDto(
            summary,
            bridgeNodesCreated,
            nodesReparented,
            MembersMoved: 0,
            details);
    }

    private static string BridgeNodeName(string layerDisplayName, string parentName) =>
        $"{layerDisplayName} · {parentName}";

    /// <summary>
    /// Node graph fix-up can attach phantom layers; keep only the layer we are inserting.
    /// </summary>
    private void DetachNonAddedStructureLayers(Guid newLayerId)
    {
        foreach (var entry in db.ChangeTracker.Entries<StructureLayer>())
        {
            if (entry.State == EntityState.Added && entry.Entity.Id == newLayerId)
                continue;

            entry.State = EntityState.Detached;
        }
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
