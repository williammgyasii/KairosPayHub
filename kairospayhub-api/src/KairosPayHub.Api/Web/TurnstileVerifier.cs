using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Web;

public sealed class TurnstileVerifier(
    IHttpClientFactory httpClientFactory,
    IOptions<TurnstileOptions> options) : ITurnstileVerifier
{
    private const string SiteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    public async Task<bool> VerifyAsync(
        string? token,
        string expectedAction,
        string? remoteIp,
        CancellationToken ct = default)
    {
        var secret = options.Value.Secret;
        if (string.IsNullOrWhiteSpace(secret))
            return true;

        var allowedHostnames = ParseHostnames(options.Value.AllowedHostnames);
        if (allowedHostnames.Count == 0)
            return false;

        if (string.IsNullOrWhiteSpace(token) || token.Length > 2048)
            return false;

        using var request = new HttpRequestMessage(HttpMethod.Post, SiteVerifyUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = secret,
                ["response"] = token,
                ["remoteip"] = remoteIp ?? "",
            }),
        };

        var client = httpClientFactory.CreateClient(nameof(TurnstileVerifier));
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            return false;

        var body = await response.Content.ReadFromJsonAsync<TurnstileSiteVerifyResponse>(ct);
        if (body is null || !body.Success)
            return false;

        if (!string.Equals(body.Action, expectedAction, StringComparison.Ordinal))
            return false;

        return !string.IsNullOrWhiteSpace(body.Hostname)
            && allowedHostnames.Contains(body.Hostname);
    }

    private static HashSet<string> ParseHostnames(string raw) =>
        raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    private sealed class TurnstileSiteVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; init; }

        [JsonPropertyName("action")]
        public string? Action { get; init; }

        [JsonPropertyName("hostname")]
        public string? Hostname { get; init; }
    }
}
