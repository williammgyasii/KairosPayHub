namespace KairosPayHub.Api.FeatureFlags;

public class ServiceRecordingsFeatureOptions
{
    public const string SectionName = "FeatureFlags:ServiceRecordings";

    /// <summary>When true, all churches see service recordings (GA).</summary>
    public bool Enabled { get; set; }

    /// <summary>Comma-separated church GUIDs for pilot when Enabled is false.</summary>
    public string AllowedChurchIds { get; set; } = string.Empty;
}
