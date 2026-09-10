using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Structure template get/set. Evolve lives on StructureTemplateEvolveService.
/// </summary>
public class StructureTemplateService(
    KairosDbContext db,
    GivingScopeService givingScope,
    ChurchReadCache readCache)
{
    public async Task<StructureTemplateDto?> GetTemplateAsync(Actor actor, CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var template = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);

        return template is null ? null : ToTemplateDto(template);
    }

    public async Task<StructureTemplateDto> SetTemplateAsync(
        Actor actor,
        string? name,
        IReadOnlyList<StructureLayerInput> layers,
        CancellationToken ct = default)
    {
        RequireChurchManager(actor);
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

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        if (existing is null)
        {
            existing = new StructureTemplate { ChurchId = churchId, Name = templateName };
            db.StructureTemplates.Add(existing);
            AddTemplateLayers(existing, layers);
        }
        else
        {
            existing.Name = templateName;
            await RelocateLayerSortOrdersAsync(existing, ct);
            ApplyReplacementLayers(existing, layers);
        }

        await SaveStructureChangesAsync(churchId, ct);
        await tx.CommitAsync(ct);

        var loaded = await db.StructureTemplates.AsNoTracking()
            .Include(t => t.Layers.OrderBy(l => l.SortOrder))
            .SingleAsync(t => t.Id == existing.Id, ct);

        return ToTemplateDto(loaded);
    }

    public static string NormalizeTemplateName(string? name)
    {
        var trimmed = name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return "Main structure";
        if (trimmed.Length > 120)
            throw new BadRequestException("Structure name must be 120 characters or fewer");
        return trimmed;
    }

    public static StructureTemplateDto ToTemplateDto(StructureTemplate template) =>
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

    private static void AddTemplateLayers(
        StructureTemplate template,
        IReadOnlyList<StructureLayerInput> layers)
    {
        for (var i = 0; i < layers.Count; i++)
        {
            var input = layers[i];
            template.Layers.Add(new StructureLayer
            {
                TemplateId = template.Id,
                SortOrder = i,
                StandardType = ParseLayerType(input.StandardType),
                DisplayName = input.DisplayName.Trim(),
            });
        }
    }

    private async Task RelocateLayerSortOrdersAsync(StructureTemplate template, CancellationToken ct)
    {
        var current = template.Layers.OrderBy(l => l.SortOrder).ToList();
        for (var i = 0; i < current.Count; i++)
            current[i].SortOrder = 1_000 + i;
        await db.SaveChangesAsync(ct);
    }

    private void ApplyReplacementLayers(
        StructureTemplate template,
        IReadOnlyList<StructureLayerInput> layers)
    {
        var current = template.Layers.OrderBy(l => l.SortOrder).ToList();
        var shared = Math.Min(current.Count, layers.Count);

        for (var i = 0; i < shared; i++)
        {
            current[i].SortOrder = i;
            current[i].StandardType = ParseLayerType(layers[i].StandardType);
            current[i].DisplayName = layers[i].DisplayName.Trim();
        }

        foreach (var extra in current.Skip(shared))
            db.StructureLayers.Remove(extra);

        for (var i = shared; i < layers.Count; i++)
        {
            var input = layers[i];
            template.Layers.Add(new StructureLayer
            {
                TemplateId = template.Id,
                SortOrder = i,
                StandardType = ParseLayerType(input.StandardType),
                DisplayName = input.DisplayName.Trim(),
            });
        }
    }

    public static void ValidateLayerInputs(IReadOnlyList<StructureLayerInput> layers)
    {
        if (layers.Count == 0)
            throw new BadRequestException("At least one org layer is required");

        if (layers.Any(l => string.IsNullOrWhiteSpace(l.DisplayName)))
            throw new BadRequestException("Each layer needs a display name");

        var lastType = ParseLayerType(layers[^1].StandardType);
        if (lastType != StructureLayerType.Cell)
            throw new BadRequestException("The deepest org layer must be Cell (members attach there)");
    }

    public static StructureLayerType ParseLayerType(string value)
    {
        if (!Enum.TryParse<StructureLayerType>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown layer type: {value}");
        return parsed;
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
