namespace KairosPayHub.Api.Storage;

public interface IObjectStorage
{
    bool IsConfigured { get; }
    Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default);
    string? PublicUrlForKey(string key);
    Task<(Stream Stream, string ContentType)?> TryOpenReadAsync(string key, CancellationToken ct = default);
}

public sealed class ObjectStorageNotConfiguredException()
    : InvalidOperationException("Object storage (R2) is not configured");
