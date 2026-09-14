namespace KairosPayHub.Api.Domain.Media;

public enum ServiceRecordingStatus
{
    Draft,
    Processing,
    Ready,
    Failed,
}

public class ServiceRecordingCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Domain.Structure.Church? Church { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<ChurchServiceRecording> Recordings { get; set; } = [];
}

public class ServiceRecordingSeries
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Domain.Structure.Church? Church { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<ChurchServiceRecording> Recordings { get; set; } = [];
}

public class ChurchServiceRecording
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Domain.Structure.Church? Church { get; set; }
    public Guid? CategoryId { get; set; }
    public ServiceRecordingCategory? Category { get; set; }
    public Guid? SeriesId { get; set; }
    public ServiceRecordingSeries? Series { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? ServiceDate { get; set; }
    public string BunnyVideoGuid { get; set; } = string.Empty;
    public ServiceRecordingStatus Status { get; set; } = ServiceRecordingStatus.Draft;
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset? RetentionExpiresAt { get; set; }
    public int? DurationSeconds { get; set; }
    public long? StorageBytes { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? CustomThumbnailUrl { get; set; }
    public int PlayCount { get; set; }
    public Guid CreatedByAuthUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
