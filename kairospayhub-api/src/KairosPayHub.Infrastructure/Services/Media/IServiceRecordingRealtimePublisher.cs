using KairosPayHub.Api.Domain.Media;

namespace KairosPayHub.Api.Services;

public interface IServiceRecordingRealtimePublisher
{
    Task PublishStatusChangedAsync(
        Guid churchId,
        Guid recordingId,
        ServiceRecordingStatus status,
        CancellationToken ct = default);
}
