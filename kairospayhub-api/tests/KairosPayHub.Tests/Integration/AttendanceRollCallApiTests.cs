using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceRollCallApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Cell_leader_cannot_mark_attendance_before_submission_opens()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var putResp = await seed.CellClient.PutAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/entries",
            new
            {
                entries = new[] { new { memberId = seed.MemberId, status = "Present" } },
            });

        Assert.Equal(HttpStatusCode.Forbidden, putResp.StatusCode);
    }

    [Fact]
    public async Task Cell_leader_marks_and_submits_after_window_opens()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

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

        await using var verifyDb = fx.CreateContext();
        var submitted = await verifyDb.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(AttendanceScopeApprovalStatus.PendingApproval, submitted.ApprovalStatus);
    }

    [Fact]
    public async Task Cell_leader_sees_members_placed_in_child_groups_on_same_cell_layer()
    {
        var seed = await AttendanceNestedCellGroupSeed.CreateAsync(_factory, fx);

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

        var entries = detail.GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(3, entries.Count);
        Assert.All(entries, entry =>
        {
            Assert.Equal(seed.CellNodeId, entry.GetProperty("memberScopeNodeId").GetGuid());
        });
        var memberNames = entries
            .Select(entry => entry.GetProperty("memberName").GetString())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Contains("Member One", memberNames);
        Assert.Contains("Member Two", memberNames);
    }
}

internal sealed record AttendanceTestSeed(
    HttpClient PastorClient,
    HttpClient CellClient,
    Guid MeetingTypeId,
    Guid OccurrenceId,
    Guid CellNodeId,
    Guid MemberId)
{
    public static async Task<AttendanceTestSeed> CreateAsync(ApiFactory factory, PostgresFixture fx)
    {
        var pastorSub = Guid.NewGuid();
        var pastor = factory.CreateClient();
        pastor.DefaultRequestHeaders.Add("X-Test-Sub", pastorSub.ToString());
        pastor.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        pastor.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");

        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Roll Call Church" });
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
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
        var fellowshipId = (await fellowshipResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var cellResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
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
        Assert.NotNull(cellLeader.AuthUserId);

        var cellClient = factory.CreateClient();
        cellClient.DefaultRequestHeaders.Add("X-Test-Sub", cellLeader.AuthUserId!.Value.ToString());
        cellClient.DefaultRequestHeaders.Add("X-Test-Email", "bob.cell@example.com");
        cellClient.DefaultRequestHeaders.Add("X-Test-Name", "Bob Cell");

        return new AttendanceTestSeed(
            pastor,
            cellClient,
            meetingTypeId,
            occurrenceId,
            cellId,
            memberId);
    }
}

internal sealed record AttendanceNestedCellGroupSeed(
    HttpClient PastorClient,
    HttpClient CellClient,
    Guid OccurrenceId,
    Guid CellNodeId)
{
    public static async Task<AttendanceNestedCellGroupSeed> CreateAsync(ApiFactory factory, PostgresFixture fx)
    {
        var pastorSub = Guid.NewGuid();
        var pastor = factory.CreateClient();
        pastor.DefaultRequestHeaders.Add("X-Test-Sub", pastorSub.ToString());
        pastor.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        pastor.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");

        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Nested Cell Church" });
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
            name = "Titans",
        });
        var fellowshipId = (await fellowshipResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var cellResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Zion Cell 1",
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

        Guid groupOneId;
        Guid groupTwoId;
        await using (var setupDb = fx.CreateContext())
        {
            groupOneId = Guid.NewGuid();
            groupTwoId = Guid.NewGuid();
            setupDb.StructureNodes.AddRange(
                new KairosPayHub.Api.Domain.Structure.StructureNode
                {
                    Id = groupOneId,
                    ChurchId = setupDb.StructureChurches.Single(c => c.Name == "Nested Cell Church").Id,
                    LayerId = cellLayerId,
                    ParentNodeId = cellId,
                    Name = "Group 1",
                },
                new KairosPayHub.Api.Domain.Structure.StructureNode
                {
                    Id = groupTwoId,
                    ChurchId = setupDb.StructureChurches.Single(c => c.Name == "Nested Cell Church").Id,
                    LayerId = cellLayerId,
                    ParentNodeId = cellId,
                    Name = "Group 2",
                });
            await setupDb.SaveChangesAsync();
        }

        await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member One",
            parentNodeId = groupOneId,
            email = "one@example.com",
        });
        await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Two",
            parentNodeId = groupTwoId,
            email = "two@example.com",
        });

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
        Assert.NotNull(cellLeader.AuthUserId);

        var cellClient = factory.CreateClient();
        cellClient.DefaultRequestHeaders.Add("X-Test-Sub", cellLeader.AuthUserId!.Value.ToString());
        cellClient.DefaultRequestHeaders.Add("X-Test-Email", "bob.cell@example.com");
        cellClient.DefaultRequestHeaders.Add("X-Test-Name", "Bob Cell");

        return new AttendanceNestedCellGroupSeed(
            pastor,
            cellClient,
            occurrenceId,
            cellId);
    }
}
