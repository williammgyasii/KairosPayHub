namespace KairosPayHub.Api.Domain.Outreach;

public enum SendClaimOutcome
{
    Won,
    Replay,
    InProgress,
    NotFound,
}

public static class OutreachSendClaim
{
    public static SendClaimOutcome ForLostClaim(OutreachChurch? row, string key)
    {
        if (row is null || !row.Saved) return SendClaimOutcome.NotFound;
        return row.SendingAt is null && row.SendKey == key && row.SentAt is not null
            ? SendClaimOutcome.Replay
            : SendClaimOutcome.InProgress;
    }
}
