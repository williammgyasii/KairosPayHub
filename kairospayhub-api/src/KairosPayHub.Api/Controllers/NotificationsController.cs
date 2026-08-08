using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(CurrentActor current, NotificationService notifications) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int limit = 30,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return Ok(new NotificationListResponse([], 0));

        var items = await notifications.ListAsync(
            authUserId,
            actor.StructureChurchId,
            unreadOnly,
            limit,
            ct);
        var unreadCount = await notifications.GetUnreadCountAsync(
            authUserId,
            actor.StructureChurchId,
            ct);

        return Ok(new NotificationListResponse(items, unreadCount));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return Ok(new NotificationUnreadCountResponse(0));

        var count = await notifications.GetUnreadCountAsync(
            authUserId,
            actor.StructureChurchId,
            ct);
        return Ok(new NotificationUnreadCountResponse(count));
    }

    [HttpPost("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return NotFound(new { error = "Notification not found" });

        var dto = await notifications.MarkReadAsync(
            authUserId,
            actor.StructureChurchId,
            notificationId,
            ct);
        return dto is null
            ? NotFound(new { error = "Notification not found" })
            : Ok(dto);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized(new { error = "Invalid token subject" });

        var actor = await current.RequireAsync(ct);
        if (actor.StructureChurchId == default)
            return Ok(new { markedRead = 0 });

        var markedRead = await notifications.MarkAllReadAsync(
            authUserId,
            actor.StructureChurchId,
            ct);
        return Ok(new { markedRead });
    }
}
