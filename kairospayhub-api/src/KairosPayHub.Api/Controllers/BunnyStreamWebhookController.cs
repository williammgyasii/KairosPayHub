using System.Text;
using System.Text.Json;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Streaming;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/webhooks/bunny-stream")]
[AllowAnonymous]
public class BunnyStreamWebhookController(
    ServiceRecordingService recordings,
    IOptions<BunnyStreamOptions> bunnyOptions) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync(ct);
        if (string.IsNullOrWhiteSpace(rawBody))
            return BadRequest(new { error = "Empty webhook body" });

        var options = bunnyOptions.Value;
        if (!BunnyStreamWebhookVerifier.IsValid(
                rawBody,
                Request.Headers["X-BunnyStream-Signature"].FirstOrDefault(),
                Request.Headers["X-BunnyStream-Signature-Version"].FirstOrDefault(),
                Request.Headers["X-BunnyStream-Signature-Algorithm"].FirstOrDefault(),
                options.WebhookSecret))
        {
            return Unauthorized(new { error = "Invalid webhook signature" });
        }

        BunnyStreamWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<BunnyStreamWebhookPayload>(
                rawBody,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            return BadRequest(new { error = "Invalid webhook payload" });
        }

        if (payload is null || string.IsNullOrWhiteSpace(payload.VideoGuid))
            return BadRequest(new { error = "Missing video guid" });

        await recordings.ApplyWebhookAsync(payload.VideoLibraryId, payload.VideoGuid, payload.Status, ct);
        return Ok(new { received = true });
    }

    private sealed class BunnyStreamWebhookPayload
    {
        public long VideoLibraryId { get; set; }
        public string VideoGuid { get; set; } = string.Empty;
        public int Status { get; set; }
    }
}
