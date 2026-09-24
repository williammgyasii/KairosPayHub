using KairosPayHub.Api.Domain.Outreach;

namespace KairosPayHub.Tests.Unit;

public class OutreachSendClaimTests
{
    [Fact]
    public void Missing_or_unsaved_church_is_not_found()
    {
        Assert.Equal(SendClaimOutcome.NotFound, OutreachSendClaim.ForLostClaim(null, "k"));
        Assert.Equal(SendClaimOutcome.NotFound, OutreachSendClaim.ForLostClaim(new OutreachChurch { Saved = false }, "k"));
    }

    [Fact]
    public void Finished_send_with_the_same_key_is_a_replay()
    {
        var row = new OutreachChurch { Saved = true, SendKey = "k", SentAt = DateTimeOffset.UtcNow };

        Assert.Equal(SendClaimOutcome.Replay, OutreachSendClaim.ForLostClaim(row, "k"));
    }

    [Fact]
    public void Send_still_running_is_in_progress_for_any_key()
    {
        var row = new OutreachChurch { Saved = true, SendKey = "k", SendingAt = DateTimeOffset.UtcNow };

        Assert.Equal(SendClaimOutcome.InProgress, OutreachSendClaim.ForLostClaim(row, "k"));
        Assert.Equal(SendClaimOutcome.InProgress, OutreachSendClaim.ForLostClaim(row, "other"));
    }
}
