using KairosPayHub.Api.Storage;

namespace KairosPayHub.Tests.Integration;

public sealed class FakeObjectStorage : IObjectStorage
{
    private readonly Dictionary<string, (byte[] Bytes, string ContentType)> _objects = new();

    public bool IsConfigured => true;

    public async Task<string> UploadAsync(
        string key,
        Stream content,
        string contentType,
        CancellationToken ct = default)
    {
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        _objects[key] = (buffer.ToArray(), contentType);
        return PublicUrlForKey(key)!;
    }

    public string? PublicUrlForKey(string key) =>
        string.IsNullOrWhiteSpace(key) ? null : $"https://fake.test/{key.TrimStart('/')}";

    public Task<(Stream Stream, string ContentType)?> TryOpenReadAsync(
        string key,
        CancellationToken ct = default)
    {
        if (!_objects.TryGetValue(key, out var stored))
            return Task.FromResult<(Stream Stream, string ContentType)?>(null);

        return Task.FromResult<(Stream Stream, string ContentType)?>(
            (new MemoryStream(stored.Bytes), stored.ContentType));
    }
}
