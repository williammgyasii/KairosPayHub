using KairosPayHub.Api.Domain.Notifications;

namespace KairosPayHub.Api.Services;

public class MeetingTypeNotificationService(
    NotificationEngine engine,
    NotificationRecipientResolver recipientResolver)
{
    public async Task NotifyCreatedAsync(
        Guid churchId,
        Guid meetingTypeId,
        string title,
        Guid createdByAuthUserId,
        CancellationToken ct = default)
    {
        var recipients = await recipientResolver.ForChurchLeadersAndAdminsAsync(
            churchId,
            createdByAuthUserId,
            ct);
        if (recipients.Count == 0)
            return;

        await engine.DeliverAsync(
            churchId,
            recipients,
            NotificationKind.MeetingTypeCreated,
            "New meeting type",
            $"Your pastor added \"{title}\". Open Attendance to use it.",
            LinkPath: "attendance/submissions",
            programId: null,
            relatedEntityId: meetingTypeId,
            ct);
    }
}
