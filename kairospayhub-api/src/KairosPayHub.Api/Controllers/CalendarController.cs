using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController(CurrentActor current, CalendarEventService calendar) : ControllerBase
{
    [HttpGet("feed")]
    public async Task<IActionResult> GetFeed(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        var items = await calendar.GetFeedAsync(actor, authUserId, from, to, ct);
        return Ok(new { items });
    }

    [HttpPost("events")]
    public async Task<IActionResult> Create(
        [FromBody] CreateCalendarEventRequest request,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        var created = await calendar.CreateAsync(
            actor,
            authUserId,
            new CreateCalendarEventInput(
                request.Title,
                request.Description,
                request.EventDate,
                request.ScopeNodeId),
            ct);
        return Ok(created);
    }

    [HttpDelete("events/{eventId:guid}")]
    public async Task<IActionResult> Delete(Guid eventId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        await calendar.DeleteAsync(actor, authUserId, eventId, ct);
        return Ok(new { ok = true });
    }
}

public sealed record CreateCalendarEventRequest(
    string Title,
    string? Description,
    DateOnly EventDate,
    Guid? ScopeNodeId);
