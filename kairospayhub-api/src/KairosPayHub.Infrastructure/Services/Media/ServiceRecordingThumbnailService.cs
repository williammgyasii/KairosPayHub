using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.FeatureFlags;
using KairosPayHub.Api.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public class ServiceRecordingThumbnailService(
    KairosDbContext db,
    AttendanceSubmissionSupport support,
    GivingScopeService scope,
    IObjectStorage storage,
    IOptions<ServiceRecordingsFeatureOptions> featureOptions)
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    private const int MaxBytes = 5 * 1024 * 1024;

    public async Task<string> UploadCustomThumbnailAsync(
        Actor actor,
        Guid recordingId,
        Stream file,
        string contentType,
        long contentLength,
        CancellationToken ct = default)
    {
        var recording = await LoadManageableAsync(actor, recordingId, ct);

        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        if (!AllowedTypes.Contains(contentType))
            throw new BadRequestException("Thumbnail must be JPEG, PNG, or WebP");

        if (contentLength <= 0 || contentLength > MaxBytes)
            throw new BadRequestException("Cover image must be between 1 byte and 5 MB");

        var ext = contentType switch
        {
            "image/png" => "png",
            "image/webp" => "webp",
            _ => "jpg",
        };
        var key = $"churches/{recording.ChurchId}/service-recordings/{recording.Id}/thumbnail.{ext}";

        var publicUrl = await storage.UploadAsync(key, file, contentType, ct);
        recording.CustomThumbnailUrl = publicUrl;
        recording.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return publicUrl;
    }

    private async Task<ChurchServiceRecording> LoadManageableAsync(
        Actor actor,
        Guid recordingId,
        CancellationToken ct)
    {
        var churchId = support.RequireStructureChurch(actor);
        if (!ServiceRecordingFeaturePolicy.IsEnabled(featureOptions.Value, churchId))
            throw new ForbiddenException("Service recordings are not enabled for this church");

        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can manage service recordings");

        return await db.ChurchServiceRecordings
            .SingleOrDefaultAsync(r => r.Id == recordingId && r.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Recording not found");
    }
}
