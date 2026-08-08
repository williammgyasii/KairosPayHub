using KairosPayHub.Api.Storage;

namespace KairosPayHub.Tests.Integration;

public sealed class FakeObjectStorage : IObjectStorage
{
    public bool IsConfigured => true;

    public Task<string> UploadAsync(
        string key,
        Stream content,
        string contentType,
        CancellationToken ct = default) =>
        Task.FromResult($"https://fake.test/{key}");
}
