namespace KairosPayHub.Api.Domain.Outreach;

public class OutreachChurch
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PlaceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public double? RadiusMiles { get; set; }
    public string Website { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = LeadStatus.Scouted;
    public bool Saved { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public string? SentSubject { get; set; }
    public string? SentBody { get; set; }
    public string? EmailSourceUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
