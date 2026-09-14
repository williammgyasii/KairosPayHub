using KairosPayHub.Api.Streaming;

namespace KairosPayHub.Tests.Unit;

public class BunnyStreamTusTokenTests
{
    [Fact]
    public void Signature_is_deterministic_for_same_inputs()
    {
        const long libraryId = 752627;
        const string apiKey = "test-library-key";
        const long expiresUnix = 1_700_000_000;
        const string videoGuid = "00000000-0000-0000-0000-000000000001";

        var first = BunnyStreamTusTokens.CreateSignature(libraryId, apiKey, expiresUnix, videoGuid);
        var second = BunnyStreamTusTokens.CreateSignature(libraryId, apiKey, expiresUnix, videoGuid);

        Assert.Equal(first, second);
        Assert.Equal(64, first.Length);
    }

    [Fact]
    public void CreateUploadCredentials_returns_tus_endpoint_and_headers()
    {
        var expires = DateTimeOffset.FromUnixTimeSeconds(1_700_000_000);
        var credentials = BunnyStreamTusTokens.CreateUploadCredentials(
            752627,
            "test-library-key",
            "00000000-0000-0000-0000-000000000001",
            expires);

        Assert.Equal(BunnyStreamTusTokens.TusUploadEndpoint, credentials.Endpoint);
        Assert.Equal(752627, credentials.LibraryId);
        Assert.Equal("00000000-0000-0000-0000-000000000001", credentials.VideoId);
        Assert.Equal(1_700_000_000, credentials.ExpiresUnix);
        Assert.False(string.IsNullOrWhiteSpace(credentials.Signature));
    }
}
