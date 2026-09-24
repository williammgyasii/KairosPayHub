namespace KairosPayHub.Api.Domain.Outreach;

public class OutreachAreaCache
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public double RadiusMiles { get; set; }
    public DateTimeOffset SearchedAt { get; set; }
}
