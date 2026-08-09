using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceFirstTimerApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Pastor_cannot_see_first_timers_before_roll_call_is_approved()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceFirstTimerSeed.OpenSubmitWithFirstTimerInviteeAsync(fx, seed);

        var listResp = await seed.PastorClient.GetAsync("/api/attendance/first-timers");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var list = await listResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, list.GetArrayLength());
    }

    [Fact]
    public async Task Pastor_sees_first_timers_after_roll_call_is_approved()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceFirstTimerSeed.OpenSubmitWithFirstTimerInviteeAsync(fx, seed);

        var approveResp = await seed.FellowshipClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approveResp.StatusCode);

        var listResp = await seed.PastorClient.GetAsync("/api/attendance/first-timers");
        var list = await listResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, list.GetArrayLength());
        Assert.Equal("Sam Visitor", list[0].GetProperty("name").GetString());
        Assert.Equal("+233241234567", list[0].GetProperty("phone").GetString());
    }
}

internal static class AttendanceFirstTimerSeed
{
    public static async Task OpenSubmitWithFirstTimerInviteeAsync(PostgresFixture fx, AttendanceApprovalSeed seed)
    {
        await using (var db = fx.CreateContext())
        {
            var occurrence = await db.AttendanceOccurrences.SingleAsync(o => o.Id == seed.OccurrenceId);
            occurrence.SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-1);
            occurrence.Status = AttendanceOccurrenceStatus.Open;

            var submission = await db.AttendanceScopeSubmissions
                .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
            submission.LockStatus = AttendanceScopeLockStatus.Editable;

            await db.SaveChangesAsync();
        }

        var inviteeResp = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/scopes/{seed.CellNodeId}/invitees",
            new
            {
                name = "Sam Visitor",
                phone = "+233241234567",
                isFirstTimer = true,
                priorChurchAttendance = "Never",
                invitedByMemberId = seed.MemberId,
            });
        Assert.Equal(HttpStatusCode.OK, inviteeResp.StatusCode);
        var inviteeId = (await inviteeResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

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
                inviteeEntries = new[]
                {
                    new { inviteeId, status = "Present", wasFirstTimer = true },
                },
            });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        var submitResp = await seed.CellClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/submit",
            null);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);
    }
}
