using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Outreach;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Outreach;

public class OutreachSendClaims(KairosDbContext db)
{
    public async Task<(SendClaimOutcome Outcome, OutreachChurch? Row)> ClaimAsync(Guid id, string key, CancellationToken ct)
    {
        // One conditional UPDATE is the lock: Postgres re-checks the WHERE after a concurrent writer commits.
        var claimed = await db.OutreachChurches
            .Where(church => church.Id == id && church.Saved && church.SendingAt == null && church.SendKey != key)
            .ExecuteUpdateAsync(set => set
                .SetProperty(church => church.SendKey, key)
                .SetProperty(church => church.SendingAt, DateTimeOffset.UtcNow), ct);

        var row = await db.OutreachChurches.AsNoTracking().FirstOrDefaultAsync(church => church.Id == id, ct);
        return claimed == 1 ? (SendClaimOutcome.Won, row) : (OutreachSendClaim.ForLostClaim(row, key), row);
    }

    public Task ReleaseAsync(Guid id, string key, CancellationToken ct) =>
        db.OutreachChurches
            .Where(church => church.Id == id && church.SendKey == key && church.SendingAt != null)
            .ExecuteUpdateAsync(set => set
                .SetProperty(church => church.SendKey, (string?)null)
                .SetProperty(church => church.SendingAt, (DateTimeOffset?)null), ct);

    public async Task<DateTimeOffset> CompleteAsync(Guid id, string key, string subject, string body, CancellationToken ct)
    {
        var sentAt = DateTimeOffset.UtcNow;
        await db.OutreachChurches
            .Where(church => church.Id == id && church.SendKey == key)
            .ExecuteUpdateAsync(set => set
                .SetProperty(church => church.SentAt, sentAt)
                .SetProperty(church => church.SentSubject, subject)
                .SetProperty(church => church.SentBody, body)
                .SetProperty(church => church.SendingAt, (DateTimeOffset?)null)
                .SetProperty(church => church.UpdatedAt, sentAt), ct);
        return sentAt;
    }
}
