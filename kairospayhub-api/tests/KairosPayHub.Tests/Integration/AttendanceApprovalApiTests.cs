using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceApprovalApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Fellowship_leader_can_review_submitted_cell_roll_call()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceApprovalSeed.OpenAndSubmitCellRollCallAsync(fx, seed);

        var reviewResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/review");
        Assert.Equal(HttpStatusCode.OK, reviewResp.StatusCode);

        var review = await reviewResp.Content.ReadFromJsonAsync<JsonElement>();
        var entries = review.GetProperty("entries").EnumerateArray().ToList();
        Assert.NotEmpty(entries);
        Assert.Contains(entries, entry => entry.GetProperty("status").GetString() == "Present");
    }

    [Fact]
    public async Task Fellowship_leader_can_view_submitted_cell_roll_call()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceApprovalSeed.OpenAndSubmitCellRollCallAsync(fx, seed);

        var detailResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}");
        Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);

        var detail = await detailResp.Content.ReadFromJsonAsync<JsonElement>();
        var cellEntries = detail.GetProperty("entries").EnumerateArray()
            .Where(entry => entry.GetProperty("memberScopeNodeId").GetGuid() == seed.CellNodeId)
            .ToList();
        Assert.NotEmpty(cellEntries);
        Assert.Contains(cellEntries, entry =>
            entry.GetProperty("status").GetString() == "Present");
    }

    [Fact]
    public async Task Fellowship_leader_approves_cell_roll_call_as_final_when_no_pfcc()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceApprovalSeed.OpenAndSubmitCellRollCallAsync(fx, seed);

        var queueResp = await seed.FellowshipClient.GetAsync("/api/attendance/approval-queue");
        Assert.Equal(HttpStatusCode.OK, queueResp.StatusCode);
        var queue = await queueResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, queue.GetArrayLength());

        var approveResp = await seed.FellowshipClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approveResp.StatusCode);

        await using var db = fx.CreateContext();
        var submission = await db.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(AttendanceScopeApprovalStatus.Approved, submission.ApprovalStatus);

        var rollupResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/rollup");
        var rollup = await rollupResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(rollup.GetProperty("totalPresent").GetInt32() >= 1);
        Assert.Contains(
            rollup.GetProperty("items").EnumerateArray().ToList(),
            row => row.GetProperty("name").GetString() == "Member Kay");
    }

    [Fact]
    public async Task Pastor_cannot_approve_pending_roll_call()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        await AttendanceApprovalSeed.OpenAndSubmitCellRollCallAsync(fx, seed);

        var approveResp = await seed.PastorClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/approve",
            null);
        Assert.Equal(HttpStatusCode.Forbidden, approveResp.StatusCode);

        var queueResp = await seed.PastorClient.GetAsync("/api/attendance/approval-queue");
        Assert.Equal(HttpStatusCode.OK, queueResp.StatusCode);
        var queue = await queueResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, queue.GetArrayLength());
    }

    [Fact]
    public async Task PFCC_manager_approves_as_final_step_when_church_has_pfcc()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: true);
        await AttendanceApprovalSeed.OpenAndSubmitCellRollCallAsync(fx, seed);

        var fellowshipApproveResp = await seed.FellowshipClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, fellowshipApproveResp.StatusCode);

        await using (var db = fx.CreateContext())
        {
            var mid = await db.AttendanceScopeSubmissions.AsNoTracking()
                .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
            Assert.Equal(AttendanceScopeApprovalStatus.PendingApproval, mid.ApprovalStatus);
        }

        var midRollupResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/rollup");
        var midRollup = await midRollupResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, midRollup.GetProperty("pendingCellCount").GetInt32());
        Assert.True(midRollup.GetProperty("totalPresent").GetInt32() >= 1);
        Assert.Equal(0, midRollup.GetProperty("approvedCellCount").GetInt32());

        var pfccQueueResp = await seed.PfccClient!.GetAsync("/api/attendance/approval-queue");
        var pfccQueue = await pfccQueueResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, pfccQueue.GetArrayLength());

        var pfccApproveResp = await seed.PfccClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, pfccApproveResp.StatusCode);

        var rollupResp = await seed.FellowshipClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/rollup");
        Assert.Equal(HttpStatusCode.OK, rollupResp.StatusCode);
        var rollup = await rollupResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, rollup.GetProperty("approvedCellCount").GetInt32());
        Assert.True(rollup.GetProperty("totalPresent").GetInt32() >= 1);
        Assert.Contains(
            rollup.GetProperty("items").EnumerateArray().ToList(),
            row => row.GetProperty("name").GetString() == "Member Kay");

        await using var verifyDb = fx.CreateContext();
        var final = await verifyDb.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(AttendanceScopeApprovalStatus.Approved, final.ApprovalStatus);
    }
}

internal sealed record AttendanceApprovalSeed(
    HttpClient PastorClient,
    HttpClient CellClient,
    HttpClient FellowshipClient,
    HttpClient? PfccClient,
    Guid OccurrenceId,
    Guid CellNodeId,
    Guid MemberId)
{
    public static async Task<AttendanceApprovalSeed> CreateAsync(
        ApiFactory factory,
        PostgresFixture fx,
        bool includePfcc)
    {
        var pastorSub = Guid.NewGuid();
        var pastor = factory.CreateClient();
        pastor.DefaultRequestHeaders.Add("X-Test-Sub", pastorSub.ToString());
        pastor.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        pastor.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");

        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Approval Church" });

        if (includePfcc)
        {
            await pastor.PutAsJsonAsync("/api/structure/template", new
            {
                layers = new[]
                {
                    new { standardType = "PFCC", displayName = "PFCC" },
                    new { standardType = "Fellowship", displayName = "Fellowship" },
                    new { standardType = "Cell", displayName = "Cell" },
                },
            });
        }
        else
        {
            await pastor.PutAsJsonAsync("/api/structure/template", new
            {
                layers = new[]
                {
                    new { standardType = "Fellowship", displayName = "Fellowship" },
                    new { standardType = "Cell", displayName = "Cell" },
                },
            });
        }

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var layers = template.GetProperty("layers");
        Guid parentNodeId;
        HttpClient? pfccClient = null;

        if (includePfcc)
        {
            var pfccLayerId = layers[0].GetProperty("id").GetGuid();
            var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();
            var cellLayerId = layers[2].GetProperty("id").GetGuid();

            var pfccResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
            {
                layerId = pfccLayerId,
                name = "North PFCC",
                newLeader = new
                {
                    name = "Pat PFCC",
                    email = "pat.pfcc@example.com",
                    phone = "+233241234560",
                    dateOfBirth = "1988-01-10",
                },
            });
            parentNodeId = (await pfccResp.Content.ReadFromJsonAsync<JsonElement>())
                .GetProperty("node").GetProperty("id").GetGuid();

            var fellowshipResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
            {
                layerId = fellowshipLayerId,
                parentNodeId,
                name = "Titans",
                newLeader = new
                {
                    name = "Jane Fellowship",
                    email = "jane.fellowship@example.com",
                    phone = "+233241234567",
                    dateOfBirth = "1995-03-15",
                },
            });
            parentNodeId = (await fellowshipResp.Content.ReadFromJsonAsync<JsonElement>())
                .GetProperty("node").GetProperty("id").GetGuid();

            var cellResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
            {
                layerId = cellLayerId,
                parentNodeId,
                name = "Cell A",
                newLeader = new
                {
                    name = "Bob Cell",
                    email = "bob.cell@example.com",
                    phone = "+233241234568",
                    dateOfBirth = "1990-06-20",
                    leaderIsCellLeader = true,
                },
            });
            var cellId = (await cellResp.Content.ReadFromJsonAsync<JsonElement>())
                .GetProperty("node").GetProperty("id").GetGuid();

            await using var db = fx.CreateContext();
            var pfccLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "pat.pfcc@example.com");
            pfccClient = ClientFor(factory, pfccLeader.AuthUserId!.Value, "pat.pfcc@example.com", "Pat PFCC");

            return await FinishSeedAsync(
                factory,
                fx,
                pastor,
                cellId,
                pfccClient);
        }

        var fellowshipLayerIdOnly = layers[0].GetProperty("id").GetGuid();
        var cellLayerIdOnly = layers[1].GetProperty("id").GetGuid();

        var fellowshipOnlyResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerIdOnly,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.fellowship@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        });
        parentNodeId = (await fellowshipOnlyResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var cellOnlyResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerIdOnly,
            parentNodeId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.cell@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });
        var cellOnlyId = (await cellOnlyResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        return await FinishSeedAsync(factory, fx, pastor, cellOnlyId, pfccClient);
    }

    private static async Task<AttendanceApprovalSeed> FinishSeedAsync(
        ApiFactory factory,
        PostgresFixture fx,
        HttpClient pastor,
        Guid cellId,
        HttpClient? pfccClient)
    {
        var memberResp = await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
            email = "kay@example.com",
        });
        var memberId = (await memberResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var createResp = await pastor.PostAsJsonAsync("/api/attendance/meeting-types", new
        {
            title = "Sunday Service",
            recurrenceKind = "Weekly",
            dayOfWeek = "Sunday",
            scopeKind = "ChurchWide",
            opensDayOffset = 0,
            opensTimeUtc = "14:00:00",
            deadlineDayOffset = 1,
            deadlineTimeUtc = "00:00:00",
        });
        var meetingTypeId = (await createResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var occurrences = await pastor.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/meeting-types/{meetingTypeId}/occurrences");
        var occurrenceId = occurrences[0].GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.cell@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship@example.com");

        return new AttendanceApprovalSeed(
            pastor,
            ClientFor(factory, cellLeader.AuthUserId!.Value, "bob.cell@example.com", "Bob Cell"),
            ClientFor(factory, fellowshipLeader.AuthUserId!.Value, "jane.fellowship@example.com", "Jane Fellowship"),
            pfccClient,
            occurrenceId,
            cellId,
            memberId);
    }

    public static async Task OpenAndSubmitCellRollCallAsync(PostgresFixture fx, AttendanceApprovalSeed seed)
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
            });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        var submitResp = await seed.CellClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/submit",
            null);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);
    }

    internal static HttpClient ClientFor(ApiFactory factory, Guid authUserId, string email, string name)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }
}
