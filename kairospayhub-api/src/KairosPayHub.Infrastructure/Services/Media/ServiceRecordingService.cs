using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.FeatureFlags;
using KairosPayHub.Api.Streaming;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public record ServiceRecordingCreateResult(
    Guid Id,
    string Title,
    ServiceRecordingStatus Status,
    string BunnyVideoGuid,
    string TusEndpoint,
    long TusLibraryId,
    string TusSignature,
    long TusExpiresUnix);

public record ServiceRecordingCategorySummaryDto(Guid Id, string Name);

public record ServiceRecordingSeriesSummaryDto(Guid Id, string Name);

public record ServiceRecordingListPageDto(
    IReadOnlyList<ServiceRecordingListItemDto> Recordings,
    int Total,
    int Page,
    int PageSize);

public record ServiceRecordingListItemDto(
    Guid Id,
    string Title,
    string? Description,
    DateOnly? ServiceDate,
    ServiceRecordingStatus Status,
    DateTimeOffset? PublishedAt,
    int? DurationSeconds,
    string? ThumbnailUrl,
    ServiceRecordingCategorySummaryDto? Category,
    ServiceRecordingSeriesSummaryDto? Series,
    int PlayCount,
    DateTimeOffset CreatedAt);

public record ServiceRecordingDetailDto(
    Guid Id,
    string Title,
    string? Description,
    DateOnly? ServiceDate,
    ServiceRecordingStatus Status,
    DateTimeOffset? PublishedAt,
    int? DurationSeconds,
    long? StorageBytes,
    ServiceRecordingCategorySummaryDto? Category,
    ServiceRecordingSeriesSummaryDto? Series,
    int PlayCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    ServiceRecordingAccess Access);

public record ServiceRecordingPlaybackDto(string EmbedUrl, long ExpiresAtUnix);

public class ServiceRecordingService(
    KairosDbContext db,
    AttendanceSubmissionSupport support,
    GivingScopeService scope,
    ServiceRecordingCategoryService categories,
    ServiceRecordingSeriesService series,
    NotificationService notifications,
    IServiceRecordingRealtimePublisher recordingRealtime,
    IBunnyStreamClient bunny,
    IOptions<BunnyStreamOptions> bunnyOptions,
    IOptions<ServiceRecordingsFeatureOptions> featureOptions)
{
    private const int DefaultPageSize = 24;
    private const int MaxPageSize = 100;

    public async Task<ServiceRecordingCreateResult> CreateAsync(
        Actor actor,
        Guid authUserId,
        string title,
        string? description,
        DateOnly? serviceDate,
        Guid? categoryId,
        Guid? seriesId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);

        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can upload service recordings");

        if (string.IsNullOrWhiteSpace(title))
            throw new BadRequestException("Title is required");

        if (!bunnyOptions.Value.IsConfigured)
            throw new InvalidOperationException("Bunny Stream is not configured");

        if (categoryId.HasValue)
            await categories.ValidateCategoryForChurchAsync(churchId, categoryId.Value, ct);

        if (seriesId.HasValue)
            await series.ValidateSeriesForChurchAsync(churchId, seriesId.Value, ct);

        var trimmedTitle = title.Trim();
        if (trimmedTitle.Length > 200)
            throw new BadRequestException("Title must be 200 characters or fewer");

        var trimmedDescription = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (trimmedDescription?.Length > 2000)
            throw new BadRequestException("Description must be 2000 characters or fewer");

        await EnsureUniqueTitleAsync(churchId, trimmedTitle, excludeRecordingId: null, ct);

        var bunnyVideo = await bunny.CreateVideoAsync(trimmedTitle, ct);
        if (string.IsNullOrWhiteSpace(bunnyVideo.Guid))
            throw new InvalidOperationException("Bunny did not return a video id");

        var now = DateTimeOffset.UtcNow;
        var recording = new ChurchServiceRecording
        {
            ChurchId = churchId,
            CategoryId = categoryId,
            SeriesId = seriesId,
            Title = trimmedTitle,
            Description = trimmedDescription,
            ServiceDate = serviceDate,
            BunnyVideoGuid = bunnyVideo.Guid,
            Status = ServiceRecordingStatus.Draft,
            RetentionExpiresAt = ServiceRecordingPolicy.RetentionExpiresFromNow(now),
            CreatedByAuthUserId = authUserId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.ChurchServiceRecordings.Add(recording);
        await db.SaveChangesAsync(ct);

        var tus = CreateTusUploadCredentials(recording.BunnyVideoGuid);
        return new ServiceRecordingCreateResult(
            recording.Id,
            recording.Title,
            recording.Status,
            recording.BunnyVideoGuid,
            tus.Endpoint,
            tus.LibraryId,
            tus.Signature,
            tus.ExpiresUnix);
    }

    public async Task<BunnyStreamTusUploadCredentials> GetUploadCredentialsAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct = default)
    {
        var recording = await LoadManageableAsync(actor, recordingId, ct);
        EnsureFeatureEnabled(recording.ChurchId);

        if (recording.Status is not (ServiceRecordingStatus.Draft or ServiceRecordingStatus.Processing))
            throw new BadRequestException("Upload credentials are only available for draft recordings");

        return CreateTusUploadCredentials(recording.BunnyVideoGuid);
    }

    public async Task ApplyWebhookAsync(
        long videoLibraryId,
        string videoGuid,
        int bunnyStatus,
        CancellationToken ct = default)
    {
        if (videoLibraryId != bunnyOptions.Value.LibraryId)
            return;

        if (string.IsNullOrWhiteSpace(videoGuid))
            return;

        var recording = await db.ChurchServiceRecordings
            .SingleOrDefaultAsync(r => r.BunnyVideoGuid == videoGuid, ct);
        if (recording is null)
            return;

        var previousStatus = recording.Status;
        var mapped = ServiceRecordingPolicy.MapBunnyStatus(bunnyStatus);
        var now = DateTimeOffset.UtcNow;
        recording.Status = mapped;
        recording.UpdatedAt = now;

        if (mapped is ServiceRecordingStatus.Ready or ServiceRecordingStatus.Failed)
        {
            var info = await bunny.GetVideoAsync(videoGuid, ct);
            if (info is not null)
                ApplyBunnyMetadata(recording, info);
        }

        await db.SaveChangesAsync(ct);

        if (previousStatus != mapped)
        {
            await recordingRealtime.PublishStatusChangedAsync(
                recording.ChurchId,
                recording.Id,
                mapped,
                ct);
        }
    }

    public async Task<ServiceRecordingListPageDto> ListAsync(
        Actor actor,
        string? search = null,
        Guid? categoryId = null,
        Guid? seriesId = null,
        int page = 1,
        int pageSize = DefaultPageSize,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);
        var canManage = scope.CanManageChurch(actor);

        if (categoryId.HasValue)
            await categories.ValidateCategoryForChurchAsync(churchId, categoryId.Value, ct);

        if (seriesId.HasValue)
            await series.ValidateSeriesForChurchAsync(churchId, seriesId.Value, ct);

        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize);

        await SyncInFlightRecordingsForChurchAsync(churchId, ct);
        await SyncMissingThumbnailsForChurchAsync(churchId, ct);

        var query = db.ChurchServiceRecordings
            .AsNoTracking()
            .Include(r => r.Category)
            .Include(r => r.Series)
            .Where(r => r.ChurchId == churchId);

        if (!canManage)
        {
            query = query.Where(r =>
                r.PublishedAt != null && r.Status == ServiceRecordingStatus.Ready);
        }

        if (categoryId.HasValue)
            query = query.Where(r => r.CategoryId == categoryId.Value);

        if (seriesId.HasValue)
            query = query.Where(r => r.SeriesId == seriesId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(r =>
                EF.Functions.ILike(r.Title, pattern)
                || (r.Description != null && EF.Functions.ILike(r.Description, pattern)));
        }

        var total = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(r => r.ServiceDate ?? DateOnly.FromDateTime(r.CreatedAt.UtcDateTime))
            .ThenByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new ServiceRecordingListPageDto(
            rows.Select(r => ToListItem(r)).ToList(),
            total,
            page,
            pageSize);
    }

    public async Task<ServiceRecordingDetailDto> UpdateAsync(
        Actor actor,
        Guid recordingId,
        string title,
        string? description,
        DateOnly? serviceDate,
        Guid? categoryId,
        Guid? seriesId,
        CancellationToken ct = default)
    {
        var recording = await LoadManageableAsync(actor, recordingId, ct);

        if (string.IsNullOrWhiteSpace(title))
            throw new BadRequestException("Title is required");

        var trimmedTitle = title.Trim();
        if (trimmedTitle.Length > 200)
            throw new BadRequestException("Title must be 200 characters or fewer");

        var trimmedDescription = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        if (trimmedDescription?.Length > 2000)
            throw new BadRequestException("Description must be 2000 characters or fewer");

        if (categoryId.HasValue)
            await categories.ValidateCategoryForChurchAsync(recording.ChurchId, categoryId.Value, ct);

        if (seriesId.HasValue)
            await series.ValidateSeriesForChurchAsync(recording.ChurchId, seriesId.Value, ct);

        await EnsureUniqueTitleAsync(recording.ChurchId, trimmedTitle, recording.Id, ct);

        recording.Title = trimmedTitle;
        recording.Description = trimmedDescription;
        recording.ServiceDate = serviceDate;
        recording.CategoryId = categoryId;
        recording.SeriesId = seriesId;
        recording.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return ToDetail(recording, canManage: true);
    }

    public async Task<ServiceRecordingDetailDto?> GetAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);
        var canManage = scope.CanManageChurch(actor);

        await SyncInFlightRecordingsForChurchAsync(churchId, ct);
        await SyncMissingThumbnailsForChurchAsync(churchId, ct);

        var recording = await db.ChurchServiceRecordings
            .AsNoTracking()
            .Include(r => r.Category)
            .Include(r => r.Series)
            .SingleOrDefaultAsync(r => r.Id == recordingId && r.ChurchId == churchId, ct);
        if (recording is null)
            return null;

        if (!ServiceRecordingPolicy.CanViewDetail(canManage, recording.Status, recording.PublishedAt))
            return null;

        return ToDetail(recording, canManage);
    }

    public async Task<ServiceRecordingDetailDto> PublishAsync(
        Actor actor,
        Guid publishedByAuthUserId,
        Guid recordingId,
        CancellationToken ct = default)
    {
        var recording = await LoadManageableAsync(actor, recordingId, ct);
        await TrySyncEncodingStatusAsync(recording, ct);
        await db.SaveChangesAsync(ct);
        if (!ServiceRecordingPolicy.CanPublish(scope.CanManageChurch(actor), recording.Status, recording.PublishedAt))
            throw new BadRequestException("Only ready, unpublished recordings can be published");

        var now = DateTimeOffset.UtcNow;
        recording.PublishedAt = now;
        recording.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        await notifications.NotifyServiceRecordingPublishedAsync(recording, publishedByAuthUserId, ct);
        return ToDetail(recording, canManage: true);
    }

    public async Task<ServiceRecordingDetailDto> UnpublishAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct = default)
    {
        var recording = await LoadManageableAsync(actor, recordingId, ct);
        if (!ServiceRecordingPolicy.CanUnpublish(scope.CanManageChurch(actor), recording.PublishedAt))
            throw new BadRequestException("Recording is not published");

        var now = DateTimeOffset.UtcNow;
        recording.PublishedAt = null;
        recording.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        return ToDetail(recording, canManage: true);
    }

    public async Task DeleteAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct = default)
    {
        var recording = await LoadManageableAsync(actor, recordingId, ct);
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can delete service recordings");

        await bunny.DeleteVideoAsync(recording.BunnyVideoGuid, ct);
        db.ChurchServiceRecordings.Remove(recording);
        await db.SaveChangesAsync(ct);
    }

    public async Task<ServiceRecordingPlaybackDto> GetPlaybackAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);
        var canManage = scope.CanManageChurch(actor);

        var recording = await db.ChurchServiceRecordings
            .SingleOrDefaultAsync(r => r.Id == recordingId && r.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Recording not found");

        if (!ServiceRecordingPolicy.CanWatchPlayback(canManage, recording.Status, recording.PublishedAt))
            throw new ForbiddenException("Recording not found");

        recording.PlayCount += 1;
        recording.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var options = bunnyOptions.Value;
        if (string.IsNullOrWhiteSpace(options.TokenSecurityKey))
            throw new InvalidOperationException("Bunny Stream playback is not configured");

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(BunnyStreamEmbedTokens.DefaultPlaybackMinutes);
        var embedUrl = BunnyStreamEmbedTokens.EmbedUrl(
            options.LibraryId,
            recording.BunnyVideoGuid,
            options.TokenSecurityKey,
            expiresAt);

        return new ServiceRecordingPlaybackDto(embedUrl, expiresAt.ToUnixTimeSeconds());
    }

    private async Task<ChurchServiceRecording> LoadManageableAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct)
    {
        var churchId = support.RequireStructureChurch(actor);
        EnsureFeatureEnabled(churchId);

        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can manage service recordings");

        return await db.ChurchServiceRecordings
            .Include(r => r.Category)
            .Include(r => r.Series)
            .SingleOrDefaultAsync(r => r.Id == recordingId && r.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Recording not found");
    }

    private static ServiceRecordingListItemDto ToListItem(ChurchServiceRecording recording) =>
        new(
            recording.Id,
            recording.Title,
            recording.Description,
            recording.ServiceDate,
            recording.Status,
            recording.PublishedAt,
            recording.DurationSeconds,
            ServiceRecordingThumbnailPolicy.DisplayUrl(recording),
            ToCategorySummary(recording.Category),
            ToSeriesSummary(recording.Series),
            recording.PlayCount,
            recording.CreatedAt);

    private static ServiceRecordingDetailDto ToDetail(ChurchServiceRecording recording, bool canManage) =>
        new(
            recording.Id,
            recording.Title,
            recording.Description,
            recording.ServiceDate,
            recording.Status,
            recording.PublishedAt,
            recording.DurationSeconds,
            recording.StorageBytes,
            ToCategorySummary(recording.Category),
            ToSeriesSummary(recording.Series),
            recording.PlayCount,
            recording.CreatedAt,
            recording.UpdatedAt,
            ServiceRecordingPolicy.AccessFor(canManage, recording.Status, recording.PublishedAt));

    private static ServiceRecordingCategorySummaryDto? ToCategorySummary(ServiceRecordingCategory? category) =>
        category is null ? null : new ServiceRecordingCategorySummaryDto(category.Id, category.Name);

    private static ServiceRecordingSeriesSummaryDto? ToSeriesSummary(ServiceRecordingSeries? series) =>
        series is null ? null : new ServiceRecordingSeriesSummaryDto(series.Id, series.Name);

    private async Task SyncInFlightRecordingsForChurchAsync(Guid churchId, CancellationToken ct)
    {
        var inFlight = await db.ChurchServiceRecordings
            .Where(r => r.ChurchId == churchId
                && r.Status != ServiceRecordingStatus.Ready
                && r.Status != ServiceRecordingStatus.Failed)
            .ToListAsync(ct);

        if (inFlight.Count == 0)
            return;

        var changed = false;
        foreach (var recording in inFlight)
        {
            if (await TrySyncEncodingStatusAsync(recording, ct))
                changed = true;
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }

    private async Task<bool> TrySyncEncodingStatusAsync(
        ChurchServiceRecording recording,
        CancellationToken ct)
    {
        if (recording.Status is ServiceRecordingStatus.Ready or ServiceRecordingStatus.Failed)
            return false;

        var info = await bunny.GetVideoAsync(recording.BunnyVideoGuid, ct);
        if (info is null)
            return false;

        var mapped = ServiceRecordingPolicy.MapBunnyStatus(info.Status);
        var changed = mapped != recording.Status;
        recording.Status = mapped;
        recording.UpdatedAt = DateTimeOffset.UtcNow;

        if (mapped is ServiceRecordingStatus.Ready or ServiceRecordingStatus.Failed)
        {
            ApplyBunnyMetadata(recording, info);
            changed = true;
        }
        else if (!string.IsNullOrWhiteSpace(info.ThumbnailUrl)
            && recording.ThumbnailUrl != info.ThumbnailUrl)
        {
            recording.ThumbnailUrl = info.ThumbnailUrl;
            changed = true;
        }

        // CustomThumbnailUrl is pastor-owned; Bunny sync never overwrites it.

        return changed;
    }

    private async Task SyncMissingThumbnailsForChurchAsync(Guid churchId, CancellationToken ct)
    {
        var missing = await db.ChurchServiceRecordings
            .Where(r => r.ChurchId == churchId && r.ThumbnailUrl == null)
            .ToListAsync(ct);

        if (missing.Count == 0)
            return;

        var changed = false;
        foreach (var recording in missing)
        {
            var info = await bunny.GetVideoAsync(recording.BunnyVideoGuid, ct);
            if (info is null || string.IsNullOrWhiteSpace(info.ThumbnailUrl))
                continue;

            recording.ThumbnailUrl = info.ThumbnailUrl;
            recording.UpdatedAt = DateTimeOffset.UtcNow;
            changed = true;
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }

    private static void ApplyBunnyMetadata(ChurchServiceRecording recording, BunnyVideoInfo info)
    {
        if (info.LengthSeconds > 0)
            recording.DurationSeconds = info.LengthSeconds;
        if (info.StorageBytes > 0)
            recording.StorageBytes = info.StorageBytes;
        if (!string.IsNullOrWhiteSpace(info.ThumbnailUrl))
            recording.ThumbnailUrl = info.ThumbnailUrl;
    }

    private BunnyStreamTusUploadCredentials CreateTusUploadCredentials(string videoGuid)
    {
        var options = bunnyOptions.Value;
        if (!options.IsConfigured)
            throw new InvalidOperationException("Bunny Stream is not configured");

        return BunnyStreamTusTokens.CreateUploadCredentials(
            options.LibraryId,
            options.ApiKey!,
            videoGuid,
            DateTimeOffset.UtcNow.AddHours(BunnyStreamTusTokens.DefaultUploadHours));
    }

    private void EnsureFeatureEnabled(Guid churchId)
    {
        if (!ServiceRecordingFeaturePolicy.IsEnabled(featureOptions.Value, churchId))
            throw new ForbiddenException("Service recordings are not enabled for this church");
    }

    private async Task EnsureUniqueTitleAsync(
        Guid churchId,
        string title,
        Guid? excludeRecordingId,
        CancellationToken ct)
    {
        var normalized = title.ToLower();
        var duplicate = await db.ChurchServiceRecordings.AnyAsync(
            r => r.ChurchId == churchId
                && r.Title.ToLower() == normalized
                && (excludeRecordingId == null || r.Id != excludeRecordingId.Value),
            ct);
        if (duplicate)
            throw new BadRequestException("A recording with this title already exists");
    }

}
