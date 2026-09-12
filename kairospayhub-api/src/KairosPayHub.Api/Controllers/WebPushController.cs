using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/notifications/push")]
[Authorize]
public class WebPushController(CurrentActor current, WebPushSubscriptionService subscriptions) : ControllerBase
{
    [HttpGet("vapid-key")]
    public async Task<IActionResult> GetVapidKey(CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out _))
            return Unauthorized(new { error = "Invalid token subject" });

        await current.RequireAsync(ct);
        var publicKey = subscriptions.VapidPublicKey;
        if (publicKey is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Web Push is not configured" });

        return Ok(new { publicKey });
    }

    [HttpGet("subscriptions")]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return Ok(new { subscriptions = Array.Empty<object>() });

        var rows = await subscriptions.ListAsync(authUserId, actor.StructureChurchId, ct);
        return Ok(new { subscriptions = rows.Select(s => new { endpoint = s.Endpoint }) });
    }

    [HttpPut("subscriptions")]
    public async Task<IActionResult> Upsert([FromBody] WebPushSubscribeRequest request, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        if (string.IsNullOrWhiteSpace(request.Endpoint)
            || string.IsNullOrWhiteSpace(request.P256dh)
            || string.IsNullOrWhiteSpace(request.Auth))
            return BadRequest(new { error = "endpoint, p256dh, and auth are required" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return BadRequest(new { error = "No church on this account" });

        await subscriptions.UpsertAsync(
            authUserId,
            actor.StructureChurchId,
            request.Endpoint.Trim(),
            request.P256dh.Trim(),
            request.Auth.Trim(),
            request.UserAgent,
            ct);
        return Ok(new { ok = true });
    }

    [HttpDelete("subscriptions")]
    public async Task<IActionResult> Delete([FromQuery] string? endpoint, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        if (string.IsNullOrWhiteSpace(endpoint))
            return BadRequest(new { error = "endpoint is required" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return Ok(new { ok = true });

        await subscriptions.DeleteAsync(authUserId, actor.StructureChurchId, endpoint.Trim(), ct);
        return Ok(new { ok = true });
    }
}

public record WebPushSubscribeRequest(string Endpoint, string P256dh, string Auth, string? UserAgent = null);
