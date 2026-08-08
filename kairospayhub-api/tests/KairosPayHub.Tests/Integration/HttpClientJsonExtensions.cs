using System.Net.Http.Json;

namespace KairosPayHub.Tests.Integration;

internal static class HttpClientJsonExtensions
{
    public static Task<HttpResponseMessage> PatchAsJsonAsync<T>(
        this HttpClient client,
        string requestUri,
        T value,
        CancellationToken cancellationToken = default) =>
        client.SendAsync(
            new HttpRequestMessage(HttpMethod.Patch, requestUri)
            {
                Content = JsonContent.Create(value),
            },
            cancellationToken);
}
