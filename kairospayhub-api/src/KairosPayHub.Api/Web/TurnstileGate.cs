using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Web;

public static class TurnstileGate
{
    public const string VerifiedHeaderName = "X-Kairos-Turnstile-Verified";

    public static async Task<IActionResult?> RejectUnlessValidAsync(
        ControllerBase controller,
        ITurnstileVerifier verifier,
        string action,
        string? token,
        CancellationToken ct)
    {
        if (string.Equals(
                controller.Request.Headers[VerifiedHeaderName],
                "1",
                StringComparison.Ordinal))
            return null;

        var ip = controller.HttpContext.Connection.RemoteIpAddress?.ToString();
        if (await verifier.VerifyAsync(token, action, ip, ct))
            return null;

        return controller.StatusCode(
            StatusCodes.Status403Forbidden,
            new { error = "Verification failed. Try again." });
    }
}
