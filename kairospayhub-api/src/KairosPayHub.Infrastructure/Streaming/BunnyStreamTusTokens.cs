using System.Security.Cryptography;
using System.Text;

namespace KairosPayHub.Api.Streaming;

public record BunnyStreamTusUploadCredentials(
    string Endpoint,
    long LibraryId,
    string VideoId,
    string Signature,
    long ExpiresUnix);

public static class BunnyStreamTusTokens
{
    public const string TusUploadEndpoint = "https://video.bunnycdn.com/tusupload";
    public const int DefaultUploadHours = 24;

    public static string CreateSignature(
        long libraryId,
        string apiKey,
        long expiresUnix,
        string videoGuid)
    {
        var payload = $"{libraryId}{apiKey}{expiresUnix}{videoGuid}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)))
            .ToLowerInvariant();
    }

    public static BunnyStreamTusUploadCredentials CreateUploadCredentials(
        long libraryId,
        string apiKey,
        string videoGuid,
        DateTimeOffset expiresAt)
    {
        var expiresUnix = expiresAt.ToUnixTimeSeconds();
        return new BunnyStreamTusUploadCredentials(
            TusUploadEndpoint,
            libraryId,
            videoGuid,
            CreateSignature(libraryId, apiKey, expiresUnix, videoGuid),
            expiresUnix);
    }
}
