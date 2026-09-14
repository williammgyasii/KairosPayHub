namespace KairosPayHub.Api.Streaming;

public record BunnyVideoInfo(
    string Guid,
    string Title,
    int Status,
    int LengthSeconds,
    long StorageBytes,
    string? ThumbnailUrl = null);

public interface IBunnyStreamClient
{
    Task<BunnyVideoInfo> CreateVideoAsync(string title, CancellationToken ct = default);

    Task<BunnyVideoInfo?> GetVideoAsync(string videoGuid, CancellationToken ct = default);

    Task DeleteVideoAsync(string videoGuid, CancellationToken ct = default);
}
