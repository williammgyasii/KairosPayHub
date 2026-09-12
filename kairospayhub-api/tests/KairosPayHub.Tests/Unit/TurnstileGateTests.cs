using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Tests.Unit;

public class TurnstileGateTests
{
    [Fact]
    public async Task Skips_verification_when_gateway_header_is_present()
    {
        var controller = new StubController();
        controller.Request.Headers[TurnstileGate.VerifiedHeaderName] = "1";

        var verifier = new RecordingVerifier(shouldAccept: false);

        var blocked = await TurnstileGate.RejectUnlessValidAsync(
            controller,
            verifier,
            "login",
            token: null,
            CancellationToken.None);

        Assert.Null(blocked);
        Assert.False(verifier.WasCalled);
    }

    private sealed class StubController : ControllerBase
    {
        public StubController()
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            };
        }
    }

    private sealed class RecordingVerifier(bool shouldAccept) : ITurnstileVerifier
    {
        public bool WasCalled { get; private set; }

        public Task<bool> VerifyAsync(
            string? token,
            string expectedAction,
            string? remoteIp,
            CancellationToken ct = default)
        {
            WasCalled = true;
            return Task.FromResult(shouldAccept);
        }
    }
}
