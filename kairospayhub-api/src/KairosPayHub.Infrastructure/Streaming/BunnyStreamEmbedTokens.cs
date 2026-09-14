using System.Security.Cryptography;
using System.Text;

namespace KairosPayHub.Api.Streaming;

public static class BunnyStreamEmbedTokens
{
    public const int DefaultPlaybackMinutes = 120;

    public static (string Token, long ExpiresUnix) Create(
        string tokenSecurityKey,
        string videoGuid,
        DateTimeOffset expiresAt)
    {
        var expiresUnix = expiresAt.ToUnixTimeSeconds();
        var payload = tokenSecurityKey + videoGuid + expiresUnix;
        var token = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)))
            .ToLowerInvariant();
        return (token, expiresUnix);
    }

    public static string EmbedUrl(
        long libraryId,
        string videoGuid,
        string tokenSecurityKey,
        DateTimeOffset expiresAt)
    {
        var (token, expiresUnix) = Create(tokenSecurityKey, videoGuid, expiresAt);
        return $"https://iframe.mediadelivery.net/embed/{libraryId}/{videoGuid}?token={token}&expires={expiresUnix}";
    }
}
