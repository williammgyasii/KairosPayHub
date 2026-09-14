using KairosPayHub.Api.Streaming;

namespace KairosPayHub.Tests.Unit;

public class BunnyStreamWebhookVerifierTests
{
    private const string Secret = "test-read-only-webhook-secret";

    [Fact]
    public void Valid_signature_passes()
    {
        const string body = """{"VideoLibraryId":752627,"VideoGuid":"abc","Status":3}""";
        var signature = BunnyStreamWebhookVerifier.ComputeSignature(body, Secret);

        Assert.True(BunnyStreamWebhookVerifier.IsValid(
            body,
            signature,
            "v1",
            "hmac-sha256",
            Secret));
    }

    [Fact]
    public void Tampered_body_fails()
    {
        const string body = """{"VideoLibraryId":752627,"VideoGuid":"abc","Status":3}""";
        var signature = BunnyStreamWebhookVerifier.ComputeSignature(body, Secret);

        Assert.False(BunnyStreamWebhookVerifier.IsValid(
            """{"VideoLibraryId":752627,"VideoGuid":"abc","Status":5}""",
            signature,
            "v1",
            "hmac-sha256",
            Secret));
    }

    [Fact]
    public void Wrong_version_or_algorithm_fails()
    {
        const string body = """{"VideoLibraryId":752627,"VideoGuid":"abc","Status":3}""";
        var signature = BunnyStreamWebhookVerifier.ComputeSignature(body, Secret);

        Assert.False(BunnyStreamWebhookVerifier.IsValid(body, signature, "v2", "hmac-sha256", Secret));
        Assert.False(BunnyStreamWebhookVerifier.IsValid(body, signature, "v1", "hmac-sha1", Secret));
    }
}
