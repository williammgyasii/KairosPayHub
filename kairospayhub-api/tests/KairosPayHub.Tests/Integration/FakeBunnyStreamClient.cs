using KairosPayHub.Api.Streaming;

namespace KairosPayHub.Tests.Integration;

public sealed class FakeBunnyStreamClient : IBunnyStreamClient
{
    private readonly Dictionary<string, BunnyVideoInfo> _videos = new(StringComparer.Ordinal);

    public Task<BunnyVideoInfo> CreateVideoAsync(string title, CancellationToken ct = default)
    {
        var guid = Guid.NewGuid().ToString("N");
        var info = new BunnyVideoInfo(guid, title, 0, 0, 0);
        _videos[guid] = info;
        return Task.FromResult(info);
    }

    public Task<BunnyVideoInfo?> GetVideoAsync(string videoGuid, CancellationToken ct = default)
    {
        if (!_videos.TryGetValue(videoGuid, out var info))
            return Task.FromResult<BunnyVideoInfo?>(null);

        return Task.FromResult<BunnyVideoInfo?>(info with
        {
            Status = 3,
            LengthSeconds = 3600,
            StorageBytes = 1024,
            ThumbnailUrl = "https://example.test/thumbnail.jpg",
        });
    }

    public Task DeleteVideoAsync(string videoGuid, CancellationToken ct = default)
    {
        _videos.Remove(videoGuid);
        return Task.CompletedTask;
    }
}
