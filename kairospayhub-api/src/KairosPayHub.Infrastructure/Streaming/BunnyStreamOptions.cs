namespace KairosPayHub.Api.Streaming;

public class BunnyStreamOptions
{
    public const string SectionName = "BunnyStream";

    public long LibraryId { get; set; }

    /// <summary>Stream library API key (Stream &gt; Library &gt; API).</summary>
    public string? ApiKey { get; set; }

    /// <summary>Embed view token security key (enable token auth on the library).</summary>
    public string? TokenSecurityKey { get; set; }

    /// <summary>Read-only library API key — webhook HMAC verification.</summary>
    public string? WebhookSecret { get; set; }

    public bool IsConfigured => LibraryId > 0 && !string.IsNullOrWhiteSpace(ApiKey);

    public string UploadUrlFor(string videoGuid) =>
        $"https://video.bunnycdn.com/library/{LibraryId}/videos/{videoGuid}";
}

