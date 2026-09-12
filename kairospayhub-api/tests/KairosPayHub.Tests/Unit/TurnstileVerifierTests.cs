using System.Net;
using KairosPayHub.Api.Web;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Tests.Unit;

public class TurnstileVerifierTests
{
    [Fact]
    public async Task Skips_verification_when_secret_is_not_configured()
    {
        var verifier = CreateVerifier(
            secret: null,
            handler: _ => throw new InvalidOperationException("Should not call siteverify"));

        var ok = await verifier.VerifyAsync(null, "login", "127.0.0.1");
        Assert.True(ok);
    }

    [Fact]
    public async Task Rejects_when_token_missing_and_secret_configured()
    {
        var verifier = CreateVerifier(
            secret: "test-secret",
            allowedHostnames: "app.kairospayhub.com");

        var ok = await verifier.VerifyAsync(null, "login", "127.0.0.1");
        Assert.False(ok);
    }

    [Fact]
    public async Task Accepts_matching_action_and_hostname()
    {
        var verifier = CreateVerifier(
            secret: "test-secret",
            allowedHostnames: "app.kairospayhub.com",
            handler: _ => JsonResponse("""
                {"success":true,"action":"login","hostname":"app.kairospayhub.com"}
                """));

        var ok = await verifier.VerifyAsync("token-123", "login", "127.0.0.1");
        Assert.True(ok);
    }

    [Fact]
    public async Task Rejects_mismatched_action()
    {
        var verifier = CreateVerifier(
            secret: "test-secret",
            allowedHostnames: "app.kairospayhub.com",
            handler: _ => JsonResponse("""
                {"success":true,"action":"register","hostname":"app.kairospayhub.com"}
                """));

        var ok = await verifier.VerifyAsync("token-123", "login", "127.0.0.1");
        Assert.False(ok);
    }

    private static TurnstileVerifier CreateVerifier(
        string? secret,
        string allowedHostnames = "",
        Func<HttpRequestMessage, HttpResponseMessage>? handler = null)
    {
        handler ??= _ => new HttpResponseMessage(HttpStatusCode.BadRequest);
        var factory = new StubHttpClientFactory(handler);
        var options = Options.Create(new TurnstileOptions
        {
            Secret = secret,
            AllowedHostnames = allowedHostnames,
        });
        return new TurnstileVerifier(factory, options);
    }

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
        };

    private sealed class StubHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> handler)
        : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) =>
            new(new StubHandler(handler)) { BaseAddress = new Uri("https://example.test/") };

        private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
            : HttpMessageHandler
        {
            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken) =>
                Task.FromResult(handler(request));
        }
    }
}
