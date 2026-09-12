namespace KairosPayHub.Api.Web;

public interface ITurnstileVerifier
{
    Task<bool> VerifyAsync(
        string? token,
        string expectedAction,
        string? remoteIp,
        CancellationToken ct = default);
}
