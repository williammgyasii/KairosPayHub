using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Email;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public class StructureService(
    KairosDbContext db,
    StructureLeaderAccountService leaderAccounts,
    IEmailSender email,
    IOptions<EmailOptions> emailOptions)
{
    public async Task<StructureTemplateDto?> GetTemplateAsync(Actor actor, CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var template = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

        return template is null ? null : ToTemplateDto(template);
    }

    public async Task<StructureTreeDto> GetTreeAsync(Actor actor, CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var church = await db.StructureChurches.AsNoTracking()
            .SingleAsync(c => c.Id == churchId, ct);

        var template = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

        var nodeEntities = await db.StructureNodes.AsNoTracking()
            .Include(n => n.Leader)
            .Where(n => n.ChurchId == churchId)
            .OrderBy(n => n.Name)
            .ToListAsync(ct);

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId)
            .OrderBy(m => m.Name)
            .ToListAsync(ct);
        var memberDtos = members.Select(ToMemberDto).ToList();

        var memberNames = memberDtos.ToDictionary(m => m.Id, m => m.Name);
        var nodes = nodeEntities
            .Select(n => ToNodeDto(n, memberNames))
            .ToList();

        return new StructureTreeDto(
            church.Id,
            church.Name,
            template is null ? null : ToTemplateDto(template),
            nodes,
            memberDtos);
    }

    public async Task<StructureTemplateDto> SetTemplateAsync(
        Actor actor,
        string? name,
        IReadOnlyList<StructureLayerInput> layers,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);
        ValidateLayerInputs(layers);
        var templateName = NormalizeTemplateName(name);

        var hasNodes = await db.StructureNodes.AnyAsync(n => n.ChurchId == churchId, ct);
        if (hasNodes)
            throw new BadRequestException(
                "Structure template cannot change after nodes exist. Use POST /api/structure/template/evolve instead.");

        var existing = await db.StructureTemplates
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

        if (existing is not null)
        {
            db.StructureLayers.RemoveRange(existing.Layers);
            existing.Layers.Clear();
            existing.Name = templateName;
        }
        else
        {
            existing = new StructureTemplate { ChurchId = churchId, Name = templateName };
            db.StructureTemplates.Add(existing);
        }

        for (var i = 0; i < layers.Count; i++)
        {
            var input = layers[i];
            existing.Layers.Add(new StructureLayer
            {
                TemplateId = existing.Id,
                SortOrder = i,
                StandardType = ParseLayerType(input.StandardType),
                DisplayName = input.DisplayName.Trim(),
            });
        }

        await db.SaveChangesAsync(ct);

        var loaded = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleAsync(t => t.Id == existing.Id, ct);

        return ToTemplateDto(loaded);
    }

    public async Task<EvolveStructureTemplateResponse> EvolveTemplateAsync(
        Actor actor,
        EvolveStructureTemplateRequest request,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
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
            var inputType = ParseLayerType(input.StandardType);
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

        var templateName = request.Name is null ? template.Name : NormalizeTemplateName(request.Name);
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
                ToTemplateDto(template),
                preview,
                Applied: false);
        }

        template.Name = templateName;
        for (var i = 0; i < existingLayers.Count; i++)
            existingLayers[i].DisplayName = inputs[i].DisplayName.Trim();

        await db.SaveChangesAsync(ct);

        var loaded = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleAsync(t => t.Id == template.Id, ct);

        return new EvolveStructureTemplateResponse(ToTemplateDto(loaded), preview, Applied: true);
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

        ValidateLayerInputs(proposedLayers);

        var nodes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId)
            .ToListAsync(ct);

        var memberCount = await db.ChurchMembers.CountAsync(m => m.ChurchId == churchId, ct);
        var preview = BuildInsertPreview(orderedLayers, insertAt, layerInput, nodes, memberCount);

        if (request.DryRun)
        {
            return new EvolveStructureTemplateResponse(
                ToTemplateDto(template),
                preview,
                Applied: false);
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        foreach (var layer in orderedLayers.Where(l => l.SortOrder >= insertAt))
            layer.SortOrder += 1;

        var newLayer = new StructureLayer
        {
            TemplateId = template.Id,
            SortOrder = insertAt,
            StandardType = ParseLayerType(layerInput.StandardType),
            DisplayName = layerInput.DisplayName.Trim(),
        };
        template.Layers.Add(newLayer);
        await db.SaveChangesAsync(ct);

        foreach (var layer in orderedLayers)
        {
            var entry = db.Entry(layer);
            if (entry.State != EntityState.Detached)
                entry.State = EntityState.Detached;
        }

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
            template.Name = NormalizeTemplateName(request.Name);

        DetachNonAddedStructureLayers(newLayer.Id);
        await db.SaveChangesAsync(ct);

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
        return new EvolveStructureTemplateResponse(ToTemplateDto(loaded), appliedPreview, Applied: true);
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
        ValidateLayerInputs(proposedLayers);

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
                ToTemplateDto(template),
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
            StandardType = ParseLayerType(layerInput.StandardType),
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
            template.Name = NormalizeTemplateName(request.Name);

        DetachNonAddedStructureLayers(newLayer.Id);
        await db.SaveChangesAsync(ct);

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
        return new EvolveStructureTemplateResponse(ToTemplateDto(loaded), appliedPreview, Applied: true);
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

    public async Task DeleteTemplateAsync(Actor actor, CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        if (await db.StructureNodes.AnyAsync(n => n.ChurchId == churchId, ct))
            throw new BadRequestException("Remove all roster items before deleting the structure definition");

        if (await db.ChurchMembers.AnyAsync(m => m.ChurchId == churchId, ct))
            throw new BadRequestException("Remove all roster items before deleting the structure definition");

        var template = await db.StructureTemplates
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

        if (template is null)
            return;

        db.StructureLayers.RemoveRange(template.Layers);
        db.StructureTemplates.Remove(template);
        await db.SaveChangesAsync(ct);
    }

    public async Task<CreateStructureNodeResponse> CreateNodeAsync(
        Actor actor,
        Guid layerId,
        Guid? parentNodeId,
        string name,
        string? unitNumber,
        Guid? leaderMemberId,
        NewStructureNodeLeaderRequest? newLeader,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Define the structure template before adding nodes");

        var layer = template.Layers.SingleOrDefault(l => l.Id == layerId)
            ?? throw new BadRequestException("Layer not found in your structure template");

        await ValidateNodeParentAsync(churchId, layer, parentNodeId, ct);

        var resolvedUnitNumber = NormalizeUnitNumber(unitNumber)
            ?? await NextUnitNumberAsync(churchId, layerId, parentNodeId, ct);

        var node = new StructureNode
        {
            ChurchId = churchId,
            LayerId = layerId,
            ParentNodeId = parentNodeId,
            Name = name.Trim(),
            UnitNumber = resolvedUnitNumber,
        };
        db.StructureNodes.Add(node);
        await db.SaveChangesAsync(ct);

        var generatedLogin = await ApplyNodeLeaderAsync(
            churchId, template, node, layer, leaderMemberId, newLeader, ct);
        await db.SaveChangesAsync(ct);

        await db.Entry(node).Reference(n => n.Leader).LoadAsync(ct);
        return new CreateStructureNodeResponse(ToNodeDto(node), generatedLogin);
    }

    public async Task<StructureNodeDto> UpdateNodeAsync(
        Actor actor,
        Guid nodeId,
        string name,
        string? unitNumber,
        Guid? leaderMemberId,
        NewStructureNodeLeaderRequest? newLeader,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var node = await db.StructureNodes
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Node not found in your church");

        var layer = template.Layers.Single(l => l.Id == node.LayerId);
        node.Name = name.Trim();
        node.UnitNumber = NormalizeUnitNumber(unitNumber);

        if (leaderMemberId is not null || newLeader is not null)
            await ApplyNodeLeaderAsync(churchId, template, node, layer, leaderMemberId, newLeader, ct);
        await db.SaveChangesAsync(ct);

        await db.Entry(node).Reference(n => n.Leader).LoadAsync(ct);
        return ToNodeDto(node);
    }

    public async Task DeleteNodeAsync(Actor actor, Guid nodeId, CancellationToken ct = default)
    {
        RequirePastor(actor);
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
            await db.SaveChangesAsync(ct);
        }

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");
        var layerOrder = template.Layers.ToDictionary(l => l.Id, l => l.SortOrder);

        var nodes = await db.StructureNodes
            .Where(n => n.ChurchId == churchId && subtreeIds.Contains(n.Id))
            .ToListAsync(ct);

        foreach (var toDelete in nodes.OrderByDescending(n => layerOrder[n.LayerId]))
            db.StructureNodes.Remove(toDelete);

        await db.SaveChangesAsync(ct);
    }

    public async Task<StructureNodeDto> CreateNodeAsync(
        Actor actor,
        Guid layerId,
        Guid? parentNodeId,
        string name,
        CancellationToken ct = default)
    {
        var result = await CreateNodeAsync(actor, layerId, parentNodeId, name, null, null, null, ct);
        return result.Node;
    }

    public async Task<StructureNodeDto> LinkNodeAsync(
        Actor actor,
        Guid nodeId,
        Guid? parentNodeId,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var node = await db.StructureNodes
            .SingleOrDefaultAsync(n => n.Id == nodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Node not found in your church");

        var layer = template.Layers.Single(l => l.Id == node.LayerId);
        await ValidateNodeParentAsync(churchId, layer, parentNodeId, ct, nodeId);

        node.ParentNodeId = parentNodeId;
        await db.SaveChangesAsync(ct);

        await db.Entry(node).Reference(n => n.Leader).LoadAsync(ct);
        return ToNodeDto(node);
    }

    public async Task<StructureMemberDto> CreateMemberAsync(
        Actor actor,
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
        CancellationToken ct = default)
    {
        RequirePastor(actor);
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

        var member = new Member
        {
            ChurchId = churchId,
            ParentNodeId = parentNodeId,
            Name = name.Trim(),
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            Position = position,
        };
        ApplyMemberProfile(member, phone, dateOfBirth, residence, occupationStatus, schoolOrWorkplace);
        if (member.Age is null && age is not null)
            member.Age = age;
        db.ChurchMembers.Add(member);
        await db.SaveChangesAsync(ct);

        return ToMemberDto(member);
    }

    private static StructureMemberDto ToMemberDto(Member member) =>
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
            member.Position.ToString());

    public static MemberOccupationStatus? ParseMemberOccupationStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (!Enum.TryParse<MemberOccupationStatus>(value.Trim(), ignoreCase: true, out var parsed))
            throw new BadRequestException("Invalid occupation status");
        return parsed;
    }

    private static void ApplyMemberProfile(
        Member member,
        string? phone,
        DateOnly? dateOfBirth,
        string? residence,
        MemberOccupationStatus? occupationStatus,
        string? schoolOrWorkplace)
    {
        member.Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        member.DateOfBirth = dateOfBirth;
        member.Age = AgeFromDateOfBirth(dateOfBirth);
        member.Residence = string.IsNullOrWhiteSpace(residence) ? null : residence.Trim();
        member.OccupationStatus = occupationStatus;
        member.SchoolOrWorkplace = string.IsNullOrWhiteSpace(schoolOrWorkplace) ? null : schoolOrWorkplace.Trim();
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

    public static MemberPosition ParseMemberPosition(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return MemberPosition.Member;
        if (!Enum.TryParse<MemberPosition>(value.Trim(), ignoreCase: true, out var parsed))
            throw new BadRequestException("Invalid member position");
        return parsed;
    }

    public async Task<StructureMemberDto> LinkMemberAsync(
        Actor actor,
        Guid memberId,
        Guid parentNodeId,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var member = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found in your church");

        var template = await LoadTemplateWithLayersAsync(churchId, ct)
            ?? throw new BadRequestException("Structure template is not defined");

        var deepestLayer = template.Layers.OrderByDescending(l => l.SortOrder).First();
        var parentNode = await db.StructureNodes.AsNoTracking()
            .SingleOrDefaultAsync(n => n.Id == parentNodeId && n.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Parent node not found in your church");

        if (parentNode.LayerId != deepestLayer.Id)
            throw new BadRequestException("Members must be placed on the deepest org layer");

        member.ParentNodeId = parentNodeId;
        await db.SaveChangesAsync(ct);

        return ToMemberDto(member);
    }

    public async Task<StructureMemberDto> UpdateMemberAsync(
        Actor actor,
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
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var member = await db.ChurchMembers
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found in your church");

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

        member.Name = name.Trim();
        member.ParentNodeId = parentNodeId;
        if (member.AuthUserId is null)
            member.Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        member.Position = position;
        ApplyMemberProfile(member, phone, dateOfBirth, residence, occupationStatus, schoolOrWorkplace);
        if (member.Age is null && age is not null)
            member.Age = age;

        await db.SaveChangesAsync(ct);

        return ToMemberDto(member);
    }

    private static StructureNodeDto ToNodeDto(
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
        CancellationToken ct)
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
                await db.SaveChangesAsync(ct);
                memberParentNodeId = autoCell.Id;
            }

            var member = new Member
            {
                ChurchId = churchId,
                ParentNodeId = memberParentNodeId,
                Name = newLeader.Name.Trim(),
                Position = leaderPosition,
            };
            ApplyMemberProfile(
                member,
                newLeader.Phone,
                newLeader.DateOfBirth,
                newLeader.Residence,
                ParseMemberOccupationStatus(newLeader.OccupationStatus),
                newLeader.SchoolOrWorkplace);

            GeneratedLeaderLoginDto? generatedLogin = null;
            var password = await leaderAccounts.ProvisionLoginAsync(
                churchId,
                node.Id,
                layer.StandardType,
                member,
                newLeader.Email,
                ct);
            generatedLogin = new GeneratedLeaderLoginDto(newLeader.Email.Trim(), password);

            if (autoCell is not null)
            {
                autoCell.LeaderMemberId = member.Id;
                leaderAccounts.AssignLeaderRole(
                    churchId,
                    member.AuthUserId!.Value,
                    ChurchRole.CellLeader,
                    autoCell.Id);
            }

            db.ChurchMembers.Add(member);
            await db.SaveChangesAsync(ct);
            node.LeaderMemberId = member.Id;

            if (generatedLogin is not null)
                await SendLeaderLoginEmailAsync(
                    churchId,
                    layer,
                    node.Name,
                    newLeader.Name.Trim(),
                    generatedLogin,
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

    private async Task SendLeaderLoginEmailAsync(
        Guid churchId,
        StructureLayer layer,
        string unitName,
        string leaderName,
        GeneratedLeaderLoginDto login,
        CancellationToken ct)
    {
        var church = await db.StructureChurches.AsNoTracking()
            .SingleAsync(c => c.Id == churchId, ct);

        var loginUrl = $"{emailOptions.Value.FrontendBaseUrl.TrimEnd('/')}/login";
        var roleTitle = $"{layer.DisplayName} leader";
        var (subject, body) = EmailTemplates.LeaderLoginCredentials(
            leaderName,
            church.Name,
            roleTitle,
            unitName.Trim(),
            loginUrl,
            login.Email,
            login.TemporaryPassword);

        await email.SendAsync(login.Email, subject, body, ct);
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

    private static string NormalizeTemplateName(string? name)
    {
        var trimmed = name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return "Main structure";
        if (trimmed.Length > 120)
            throw new BadRequestException("Structure name must be 120 characters or fewer");
        return trimmed;
    }

    private static StructureTemplateDto ToTemplateDto(StructureTemplate template) =>
        new(
            template.Id,
            template.Name,
            template.Layers
                .OrderBy(l => l.SortOrder)
                .Select(l => new StructureLayerDto(
                    l.Id,
                    l.SortOrder,
                    l.StandardType.ToString(),
                    l.DisplayName))
                .ToList());

    private static void ValidateLayerInputs(IReadOnlyList<StructureLayerInput> layers)
    {
        if (layers.Count == 0)
            throw new BadRequestException("At least one org layer is required");

        if (layers.Any(l => string.IsNullOrWhiteSpace(l.DisplayName)))
            throw new BadRequestException("Each layer needs a display name");

        var lastType = ParseLayerType(layers[^1].StandardType);
        if (lastType != StructureLayerType.Cell)
            throw new BadRequestException("The deepest org layer must be Cell (members attach there)");
    }

    private static StructureLayerType ParseLayerType(string value)
    {
        if (!Enum.TryParse<StructureLayerType>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown layer type: {value}");
        return parsed;
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    private static void RequirePastor(Actor actor)
    {
        if (actor.StructureRole != ChurchRole.Pastor && actor.Role != Role.Pastor)
            throw new ForbiddenException("Only a pastor can manage church structure");
    }
}
