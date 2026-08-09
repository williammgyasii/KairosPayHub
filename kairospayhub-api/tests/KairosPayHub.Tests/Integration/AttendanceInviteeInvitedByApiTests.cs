using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceInviteeInvitedByApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Create_invitee_stores_invited_by_cell_member()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await OpenOccurrenceAsync(fx, seed);

        var createResp = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/scopes/{seed.CellNodeId}/invitees",
            new
            {
                name = "Sam Visitor",
                phone = "+233241234567",
                isFirstTimer = true,
                priorChurchAttendance = "Never",
                invitedByMemberId = seed.MemberId,
            });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(seed.MemberId, created.GetProperty("invitedByMemberId").GetGuid());
        Assert.Equal("Member Kay", created.GetProperty("invitedByMemberName").GetString());
    }

    [Fact]
    public async Task Create_invitee_rejects_member_outside_cell()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await OpenOccurrenceAsync(fx, seed);

        await using var db = fx.CreateContext();
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship@example.com");

        var createResp = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/scopes/{seed.CellNodeId}/invitees",
            new
            {
                name = "Sam Visitor",
                phone = "+233241234567",
                isFirstTimer = true,
                priorChurchAttendance = "Never",
                invitedByMemberId = fellowshipLeader.Id,
            });
        Assert.Equal(HttpStatusCode.BadRequest, createResp.StatusCode);
    }

    [Fact]
    public async Task Approval_review_shows_invited_by_on_present_invitees()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await OpenOccurrenceAsync(fx, seed);

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

        var reviewResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/review");
        Assert.Equal(HttpStatusCode.OK, reviewResp.StatusCode);

        var review = await reviewResp.Content.ReadFromJsonAsync<JsonElement>();
        var inviteeRows = review.GetProperty("inviteeEntries").EnumerateArray().ToList();
        Assert.Contains(
            inviteeRows,
            row =>
                row.GetProperty("inviteeName").GetString() == "Sam Visitor"
                && row.GetProperty("invitedByMemberName").GetString() == "Member Kay");
    }

    private static async Task OpenOccurrenceAsync(PostgresFixture fx, AttendanceApprovalSeed seed)
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
}
