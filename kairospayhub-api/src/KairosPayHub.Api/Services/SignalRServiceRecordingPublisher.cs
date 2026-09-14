using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.Hubs;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.SignalR;

namespace KairosPayHub.Api.Services;

public class SignalRServiceRecordingPublisher(
    IHubContext<NotificationHub, INotificationClient> hub,
    NotificationRecipientResolver recipients)
    : IServiceRecordingRealtimePublisher
{
    public async Task PublishStatusChangedAsync(
        Guid churchId,
        Guid recordingId,
        ServiceRecordingStatus status,
        CancellationToken ct = default)
    {
        var managerIds = await recipients.ForChurchManagersAsync(churchId, ct);
        if (managerIds.Count == 0)
            return;

        var payload = new ServiceRecordingStatusChangedDto(
            recordingId,
            status.ToString(),
            churchId);

        foreach (var authUserId in managerIds)
        {
            await hub.Clients
                .Group(NotificationHub.UserGroup(authUserId))
                .ServiceRecordingStatusChanged(payload);
        }
    }
}
