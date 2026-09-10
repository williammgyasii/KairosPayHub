using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Inbox read path: list, unread, mark read. Not used for composing or delivery.
/// </summary>
public class NotificationInboxService(KairosDbContext db)
{
    public async Task<IReadOnlyList<NotificationDto>> ListAsync(
        Guid authUserId,
        Guid churchId,
        bool unreadOnly,
        int limit,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);

        var query = db.Notifications.AsNoTracking()
            .Where(n => n.RecipientAuthUserId == authUserId && n.ChurchId == churchId);

        if (unreadOnly)
            query = query.Where(n => n.ReadAt == null);

        var rows = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return rows.Select(NotificationEngine.ToDto).ToList();
    }

    public async Task<int> GetUnreadCountAsync(
        Guid authUserId,
        Guid churchId,
        CancellationToken ct = default) =>
        await db.Notifications.CountAsync(
            n => n.RecipientAuthUserId == authUserId
                && n.ChurchId == churchId
                && n.ReadAt == null,
            ct);

    public async Task<NotificationDto?> MarkReadAsync(
        Guid authUserId,
        Guid churchId,
        Guid notificationId,
        CancellationToken ct = default)
    {
        var row = await db.Notifications.SingleOrDefaultAsync(
            n => n.Id == notificationId
                && n.RecipientAuthUserId == authUserId
                && n.ChurchId == churchId,
            ct);

        if (row is null)
            return null;

        if (row.ReadAt is null)
        {
            row.ReadAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return NotificationEngine.ToDto(row);
    }

    public async Task<int> MarkAllReadAsync(
        Guid authUserId,
        Guid churchId,
        CancellationToken ct = default)
    {
        var unread = await db.Notifications
            .Where(n => n.RecipientAuthUserId == authUserId
                && n.ChurchId == churchId
                && n.ReadAt == null)
            .ToListAsync(ct);

        if (unread.Count == 0)
            return 0;

        var now = DateTimeOffset.UtcNow;
        foreach (var row in unread)
            row.ReadAt = now;

        await db.SaveChangesAsync(ct);
        return unread.Count;
    }
}
