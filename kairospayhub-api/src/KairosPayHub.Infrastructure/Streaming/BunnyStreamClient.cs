using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Streaming;

public class BunnyStreamClient(IHttpClientFactory httpClientFactory, IOptions<BunnyStreamOptions> options)
    : IBunnyStreamClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly BunnyStreamOptions _options = options.Value;

    public async Task<BunnyVideoInfo> CreateVideoAsync(string title, CancellationToken ct = default)
    {
        EnsureConfigured();
        using var request = CreateRequest(HttpMethod.Post, $"library/{_options.LibraryId}/videos");
        request.Content = JsonContent.Create(new { title });
        using var response = await SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
        var payload = await response.Content.ReadFromJsonAsync<BunnyVideoPayload>(JsonOptions, ct)
            ?? throw new InvalidOperationException("Empty Bunny create video response");
        return Map(payload);
    }

    public async Task<BunnyVideoInfo?> GetVideoAsync(string videoGuid, CancellationToken ct = default)
    {
        EnsureConfigured();
        using var request = CreateRequest(
            HttpMethod.Get,
            $"library/{_options.LibraryId}/videos/{videoGuid}");
        using var response = await SendAsync(request, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        await EnsureSuccessAsync(response, ct);
        var payload = await response.Content.ReadFromJsonAsync<BunnyVideoPayload>(JsonOptions, ct);
        return payload is null ? null : Map(payload);
    }

    public async Task DeleteVideoAsync(string videoGuid, CancellationToken ct = default)
    {
        EnsureConfigured();
        using var request = CreateRequest(
            HttpMethod.Delete,
            $"library/{_options.LibraryId}/videos/{videoGuid}");
        using var response = await SendAsync(request, ct);
        await EnsureSuccessAsync(response, ct);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, $"https://video.bunnycdn.com/{path}");
        request.Headers.Add("AccessKey", _options.ApiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return request;
    }

    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient(nameof(BunnyStreamClient));
        return await client.SendAsync(request, ct);
    }

    private void EnsureConfigured()
    {
        if (!_options.IsConfigured)
            throw new InvalidOperationException("Bunny Stream is not configured");
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode)
            return;
        var body = await response.Content.ReadAsStringAsync(ct);
        throw new InvalidOperationException(
            $"Bunny Stream API failed ({(int)response.StatusCode}): {body}");
    }

    private static BunnyVideoInfo Map(BunnyVideoPayload payload) =>
        new(
            payload.Guid ?? string.Empty,
            payload.Title ?? string.Empty,
            payload.Status,
            payload.Length,
            payload.StorageSize,
            payload.ThumbnailUrl);

    private sealed class BunnyVideoPayload
    {
        public string? Guid { get; set; }
        public string? Title { get; set; }
        public int Status { get; set; }
        public int Length { get; set; }
        public long StorageSize { get; set; }
        public string? ThumbnailUrl { get; set; }
    }
}
