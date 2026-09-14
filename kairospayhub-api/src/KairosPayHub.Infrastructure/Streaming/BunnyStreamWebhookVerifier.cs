using System.Security.Cryptography;
using System.Text;

namespace KairosPayHub.Api.Streaming;

public static class BunnyStreamWebhookVerifier
{
    public static bool IsValid(
        string rawBody,
        string? signatureHeader,
        string? signatureVersion,
        string? signatureAlgorithm,
        string? webhookSecret)
    {
        if (string.IsNullOrWhiteSpace(webhookSecret))
            return false;

        if (!string.Equals(signatureVersion, "v1", StringComparison.Ordinal))
            return false;

        if (!string.Equals(signatureAlgorithm, "hmac-sha256", StringComparison.Ordinal))
            return false;

        if (string.IsNullOrWhiteSpace(signatureHeader)
            || signatureHeader.Length != 64
            || !signatureHeader.All(static c => c is >= '0' and <= '9' or >= 'a' and <= 'f'))
        {
            return false;
        }

        var expected = ComputeSignature(rawBody, webhookSecret);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signatureHeader));
    }

    public static string ComputeSignature(string rawBody, string webhookSecret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(webhookSecret);
        var bodyBytes = Encoding.UTF8.GetBytes(rawBody);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(bodyBytes)).ToLowerInvariant();
    }
}
