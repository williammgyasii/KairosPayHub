using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public class WebPushSubscriptionService(
    KairosDbContext db,
    IOptions<WebPushOptions> options)
{
    public string? VapidPublicKey =>
        string.IsNullOrWhiteSpace(options.Value.PublicKey) ? null : options.Value.PublicKey;

    public async Task<IReadOnlyList<WebPushSubscription>> ListAsync(
        Guid authUserId,
        Guid churchId,
        CancellationToken ct = default) =>
        await db.WebPushSubscriptions.AsNoTracking()
            .Where(s => s.AuthUserId == authUserId && s.ChurchId == churchId)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task UpsertAsync(
        Guid authUserId,
        Guid churchId,
        string endpoint,
        string p256dh,
        string auth,
        string? userAgent,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = await db.WebPushSubscriptions
            .SingleOrDefaultAsync(s => s.Endpoint == endpoint, ct);

        if (existing is null)
        {
            db.WebPushSubscriptions.Add(new WebPushSubscription
            {
                AuthUserId = authUserId,
                ChurchId = churchId,
                Endpoint = endpoint,
                P256dh = p256dh,
                Auth = auth,
                UserAgent = userAgent,
                CreatedAt = now,
                LastSeenAt = now,
            });
        }
        else
        {
            existing.AuthUserId = authUserId;
            existing.ChurchId = churchId;
            existing.P256dh = p256dh;
            existing.Auth = auth;
            existing.UserAgent = userAgent;
            existing.LastSeenAt = now;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(
        Guid authUserId,
        Guid churchId,
        string endpoint,
        CancellationToken ct = default)
    {
        var existing = await db.WebPushSubscriptions.SingleOrDefaultAsync(
            s => s.Endpoint == endpoint && s.AuthUserId == authUserId && s.ChurchId == churchId,
            ct);
        if (existing is null)
            return;

        db.WebPushSubscriptions.Remove(existing);
        await db.SaveChangesAsync(ct);
    }
}
