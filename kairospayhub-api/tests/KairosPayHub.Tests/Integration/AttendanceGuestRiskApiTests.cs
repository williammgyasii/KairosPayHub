using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Attendance;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceGuestRiskApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Padded_invitee_sheet_is_flagged_with_imbalance_reason()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await OpenOccurrenceAsync(fx, seed);

        var inviteeIds = new List<Guid>();
        for (var i = 1; i <= 10; i++)
        {
            var createResp = await seed.CellClient.PostAsJsonAsync(
                $"/api/attendance/scopes/{seed.CellNodeId}/invitees",
                new
                {
                    name = $"Guest {i}",
                    phone = $"+23324100000{i}",
                    isFirstTimer = true,
                    priorChurchAttendance = "Never",
                    invitedByMemberId = seed.MemberId,
                });
            Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
            inviteeIds.Add((await createResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid());
        }

        await SubmitWithInviteesAsync(seed, inviteeIds);

        var queueResp = await seed.FellowshipClient.GetAsync("/api/attendance/approval-queue");
        Assert.Equal(HttpStatusCode.OK, queueResp.StatusCode);
        var queue = await queueResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, queue.GetArrayLength());
        var item = queue[0];
        Assert.Equal(GuestRisk.Flagged, item.GetProperty("guestRiskLevel").GetString());
        Assert.Contains(
            item.GetProperty("guestRiskReasons").EnumerateArray().Select(r => r.GetString()),
            reason => reason == GuestRisk.ImbalanceReason);

        var reviewResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/review");
        Assert.Equal(HttpStatusCode.OK, reviewResp.StatusCode);
        var review = await reviewResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(GuestRisk.Flagged, review.GetProperty("guestRiskLevel").GetString());

        await using var db = fx.CreateContext();
        var submission = await db.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(GuestRisk.Flagged, submission.GuestRiskLevel);
        Assert.Contains(GuestRisk.ImbalanceReason, submission.GuestRiskReasons);
    }

    [Fact]
    public async Task Ordinary_sheet_is_clear()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceApprovalSeed.OpenAndSubmitCellRollCallAsync(fx, seed);

        var queueResp = await seed.FellowshipClient.GetAsync("/api/attendance/approval-queue");
        Assert.Equal(HttpStatusCode.OK, queueResp.StatusCode);
        var queue = await queueResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(GuestRisk.Clear, queue[0].GetProperty("guestRiskLevel").GetString());
        Assert.Equal(0, queue[0].GetProperty("guestRiskReasons").GetArrayLength());
    }

    [Fact]
    public async Task Create_invitee_allows_duplicate_Ama_name()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await OpenOccurrenceAsync(fx, seed);

        var first = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/scopes/{seed.CellNodeId}/invitees",
            new
            {
                name = "Ama",
                phone = "+233241111111",
                isFirstTimer = true,
                priorChurchAttendance = "Never",
                invitedByMemberId = seed.MemberId,
            });
        var second = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/scopes/{seed.CellNodeId}/invitees",
            new
            {
                name = "Ama",
                phone = "+233242222222",
                isFirstTimer = true,
                priorChurchAttendance = "Never",
                invitedByMemberId = seed.MemberId,
            });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    }

    static async Task OpenOccurrenceAsync(PostgresFixture fx, AttendanceApprovalSeed seed)
    {
        await using var db = fx.CreateContext();
        var occurrence = await db.AttendanceOccurrences.SingleAsync(o => o.Id == seed.OccurrenceId);
        occurrence.SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-1);
        occurrence.Status = AttendanceOccurrenceStatus.Open;

        var submission = await db.AttendanceScopeSubmissions
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        submission.LockStatus = AttendanceScopeLockStatus.Editable;

        await db.SaveChangesAsync();
    }

    static async Task SubmitWithInviteesAsync(AttendanceApprovalSeed seed, IReadOnlyList<Guid> inviteeIds)
    {
        var detail = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}");
        var memberIds = detail.GetProperty("entries")
            .EnumerateArray()
            .Select(e => e.GetProperty("memberId").GetGuid())
            .ToList();

        var putResp = await seed.CellClient.PutAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/entries",
            new
            {
                entries = memberIds.Select(id => new { memberId = id, status = "Present" }).ToArray(),
                inviteeEntries = inviteeIds
                    .Select(id => new { inviteeId = id, status = "Present", wasFirstTimer = true })
                    .ToArray(),
            });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        var submitResp = await seed.CellClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/submit",
            null);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);
    }
}
