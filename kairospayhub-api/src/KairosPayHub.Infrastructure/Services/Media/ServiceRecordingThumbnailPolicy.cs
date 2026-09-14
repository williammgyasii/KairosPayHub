using KairosPayHub.Api.Domain.Media;

namespace KairosPayHub.Api.Services;

public static class ServiceRecordingThumbnailPolicy
{
    public static string? DisplayUrl(ChurchServiceRecording recording) =>
        recording.CustomThumbnailUrl ?? recording.ThumbnailUrl;
}
