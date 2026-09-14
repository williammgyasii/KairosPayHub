using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.FeatureFlags;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public record ServiceRecordingCategoryDto(
    Guid Id,
    string Name,
    int SortOrder,
    int RecordingCount);

public class ServiceRecordingCategoryService(
    KairosDbContext db,
    AttendanceSubmissionSupport support,
    GivingScopeService scope,
    IOptions<ServiceRecordingsFeatureOptions> featureOptions)
{
    public async Task<IReadOnlyList<ServiceRecordingCategoryDto>> ListAsync(
        Actor actor,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);
        var canManage = scope.CanManageChurch(actor);

        var query = db.ServiceRecordingCategories
            .AsNoTracking()
            .Where(c => c.ChurchId == churchId);

        if (!canManage)
        {
            query = query.Where(c => c.Recordings.Any(r =>
                r.PublishedAt != null && r.Status == ServiceRecordingStatus.Ready));
        }

        var rows = await query
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new ServiceRecordingCategoryDto(
                c.Id,
                c.Name,
                c.SortOrder,
                c.Recordings.Count))
            .ToListAsync(ct);

        return rows;
    }

    public async Task<ServiceRecordingCategoryDto> CreateAsync(
        Actor actor,
        string name,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);

        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can manage recording categories");

        var trimmed = name.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new BadRequestException("Category name is required");

        if (trimmed.Length > 100)
            throw new BadRequestException("Category name must be 100 characters or fewer");

        var duplicate = await db.ServiceRecordingCategories.AnyAsync(
            c => c.ChurchId == churchId && c.Name.ToLower() == trimmed.ToLower(),
            ct);
        if (duplicate)
            throw new BadRequestException("A category with this name already exists");

        var maxSort = await db.ServiceRecordingCategories
            .Where(c => c.ChurchId == churchId)
            .Select(c => (int?)c.SortOrder)
            .MaxAsync(ct) ?? -1;

        var now = DateTimeOffset.UtcNow;
        var category = new ServiceRecordingCategory
        {
            ChurchId = churchId,
            Name = trimmed,
            SortOrder = maxSort + 1,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.ServiceRecordingCategories.Add(category);
        await db.SaveChangesAsync(ct);

        return new ServiceRecordingCategoryDto(category.Id, category.Name, category.SortOrder, 0);
    }

    public async Task<ServiceRecordingCategoryDto> RenameAsync(
        Actor actor,
        Guid categoryId,
        string name,
        CancellationToken ct = default)
    {
        var category = await LoadManageableAsync(actor, categoryId, ct);

        var trimmed = name.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new BadRequestException("Category name is required");

        if (trimmed.Length > 100)
            throw new BadRequestException("Category name must be 100 characters or fewer");

        var duplicate = await db.ServiceRecordingCategories.AnyAsync(
            c => c.ChurchId == category.ChurchId
                && c.Id != categoryId
                && c.Name.ToLower() == trimmed.ToLower(),
            ct);
        if (duplicate)
            throw new BadRequestException("A category with this name already exists");

        category.Name = trimmed;
        category.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var count = await db.ChurchServiceRecordings.CountAsync(r => r.CategoryId == categoryId, ct);
        return new ServiceRecordingCategoryDto(category.Id, category.Name, category.SortOrder, count);
    }

    public async Task DeleteAsync(
        Actor actor,
        Guid categoryId,
        CancellationToken ct = default)
    {
        var category = await LoadManageableAsync(actor, categoryId, ct);
        db.ServiceRecordingCategories.Remove(category);
        await db.SaveChangesAsync(ct);
    }

    internal async Task ValidateCategoryForChurchAsync(
        Guid churchId,
        Guid categoryId,
        CancellationToken ct)
    {
        var exists = await db.ServiceRecordingCategories.AnyAsync(
            c => c.Id == categoryId && c.ChurchId == churchId,
            ct);
        if (!exists)
            throw new BadRequestException("Category not found");
    }

    private async Task<ServiceRecordingCategory> LoadManageableAsync(
        Actor actor,
        Guid categoryId,
        CancellationToken ct)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);

        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can manage recording categories");

        return await db.ServiceRecordingCategories
            .SingleOrDefaultAsync(c => c.Id == categoryId && c.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Category not found");
    }

    private void EnsureFeatureEnabled(Guid churchId)
    {
        if (!ServiceRecordingFeaturePolicy.IsEnabled(featureOptions.Value, churchId))
            throw new ForbiddenException("Service recordings are not enabled for this church");
    }
}
