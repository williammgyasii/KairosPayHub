namespace KairosPayHub.Api.Domain.Notifications;

public enum NotificationKind
{
    SubGivingPendingApproval,
    SubGivingApproved,
    SubGivingRejected,
    ContributionPendingApproval,
    ContributionApproved,
    ContributionRejected,
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Guid RecipientAuthUserId { get; set; }
    public NotificationKind Kind { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? LinkPath { get; set; }
    public Guid? ProgramId { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
