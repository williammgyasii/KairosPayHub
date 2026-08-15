namespace KairosPayHub.Api.Domain.Events;

public class ChurchCalendarEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Guid? ScopeNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public Guid CreatedByAuthUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
