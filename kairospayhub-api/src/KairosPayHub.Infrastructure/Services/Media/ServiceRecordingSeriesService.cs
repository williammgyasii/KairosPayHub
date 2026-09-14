using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.FeatureFlags;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public record ServiceRecordingSeriesDto(
    Guid Id,
    string Name,
    string? Description,
    int SortOrder,
    int RecordingCount);

public class ServiceRecordingSeriesService(
    KairosDbContext db,
    AttendanceSubmissionSupport support,
    GivingScopeService scope,
    IOptions<ServiceRecordingsFeatureOptions> featureOptions)
{
    public async Task<IReadOnlyList<ServiceRecordingSeriesDto>> ListAsync(
        Actor actor,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);
        var canManage = scope.CanManageChurch(actor);

        var query = db.ServiceRecordingSeries
            .AsNoTracking()
            .Where(s => s.ChurchId == churchId);

        if (!canManage)
        {
            query = query.Where(s => s.Recordings.Any(r =>
                r.PublishedAt != null && r.Status == ServiceRecordingStatus.Ready));
        }

        return await query
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Name)
            .Select(s => new ServiceRecordingSeriesDto(
                s.Id,
                s.Name,
                s.Description,
                s.SortOrder,
                s.Recordings.Count))
            .ToListAsync(ct);
    }

    public async Task<ServiceRecordingSeriesDto> CreateAsync(
        Actor actor,
        string name,
        string? description,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);

        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can manage message series");

        var trimmed = name.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new BadRequestException("Series name is required");

        if (trimmed.Length > 100)
            throw new BadRequestException("Series name must be 100 characters or fewer");

        var trimmedDescription = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (trimmedDescription?.Length > 500)
            throw new BadRequestException("Series description must be 500 characters or fewer");

        var duplicate = await db.ServiceRecordingSeries.AnyAsync(
            s => s.ChurchId == churchId && s.Name.ToLower() == trimmed.ToLower(),
            ct);
        if (duplicate)
            throw new BadRequestException("A series with this name already exists");

        var maxSort = await db.ServiceRecordingSeries
            .Where(s => s.ChurchId == churchId)
            .Select(s => (int?)s.SortOrder)
            .MaxAsync(ct) ?? -1;

        var now = DateTimeOffset.UtcNow;
        var series = new ServiceRecordingSeries
        {
            ChurchId = churchId,
            Name = trimmed,
            Description = trimmedDescription,
            SortOrder = maxSort + 1,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.ServiceRecordingSeries.Add(series);
        await db.SaveChangesAsync(ct);

        return new ServiceRecordingSeriesDto(series.Id, series.Name, series.Description, series.SortOrder, 0);
    }

    internal async Task ValidateSeriesForChurchAsync(
        Guid churchId,
        Guid seriesId,
        CancellationToken ct)
    {
        var exists = await db.ServiceRecordingSeries.AnyAsync(
            s => s.Id == seriesId && s.ChurchId == churchId,
            ct);
        if (!exists)
            throw new BadRequestException("Series not found");
    }

    private void EnsureFeatureEnabled(Guid churchId)
    {
        if (!ServiceRecordingFeaturePolicy.IsEnabled(featureOptions.Value, churchId))
            throw new ForbiddenException("Service recordings are not enabled for this church");
    }
}
