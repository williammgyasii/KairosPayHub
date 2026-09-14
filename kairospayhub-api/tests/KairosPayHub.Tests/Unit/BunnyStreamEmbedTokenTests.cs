using KairosPayHub.Api.Streaming;

namespace KairosPayHub.Tests.Unit;

public class BunnyStreamEmbedTokenTests
{
    [Fact]
    public void Token_is_deterministic_for_same_inputs()
    {
        var expires = DateTimeOffset.FromUnixTimeSeconds(1_626_344_020);
        var first = BunnyStreamEmbedTokens.Create("secret-key", "video-guid", expires);
        var second = BunnyStreamEmbedTokens.Create("secret-key", "video-guid", expires);

        Assert.Equal(first.Token, second.Token);
        Assert.Equal(1_626_344_020, first.ExpiresUnix);
    }

    [Fact]
    public void Embed_url_includes_token_and_expires()
    {
        var expires = DateTimeOffset.FromUnixTimeSeconds(1_626_344_020);
        var url = BunnyStreamEmbedTokens.EmbedUrl(752627, "video-guid", "secret-key", expires);

        Assert.StartsWith("https://iframe.mediadelivery.net/embed/752627/video-guid?", url);
        Assert.Contains("token=", url, StringComparison.Ordinal);
        Assert.Contains("expires=1626344020", url, StringComparison.Ordinal);
    }
}
