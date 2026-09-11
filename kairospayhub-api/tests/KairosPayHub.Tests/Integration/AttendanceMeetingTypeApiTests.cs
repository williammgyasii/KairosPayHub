using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceMeetingTypeApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient(string? sub = null)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub ?? Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        return client;
    }

    private HttpClient ClientForAuthUser(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    [Fact]
    public async Task Pastor_creates_weekly_sunday_meeting_type_with_auto_generated_occurrences()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Attendance Church" });

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

        await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
            email = "kay@example.com",
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
            autoGenerateWeeksAhead = 8,
        });

        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Sunday Service", created.GetProperty("title").GetString());
        var meetingTypeId = created.GetProperty("id").GetGuid();

        var occurrencesResp = await pastor.GetAsync($"/api/attendance/meeting-types/{meetingTypeId}/occurrences");
        Assert.Equal(HttpStatusCode.OK, occurrencesResp.StatusCode);
        var occurrences = await occurrencesResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(occurrences.GetArrayLength() >= 1);

        var first = occurrences[0];
        var status = first.GetProperty("status").GetString();
        Assert.True(status is "Scheduled" or "Open");
        Assert.True(first.GetProperty("scopeSubmissionCount").GetInt32() >= 1);
        Assert.True(first.TryGetProperty("submissionOpensAt", out _));
        Assert.True(first.TryGetProperty("submissionDeadlineAt", out _));

        var secondListResp = await pastor.GetAsync($"/api/attendance/meeting-types/{meetingTypeId}/occurrences");
        var secondList = await secondListResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(occurrences.GetArrayLength(), secondList.GetArrayLength());
    }

    [Fact]
    public async Task Pastor_creates_meeting_type_open_now_for_demo_opens_today_occurrence()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Demo Church" });

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
                email = "jane.demo@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        });
        var fellowshipId = (await fellowshipResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.demo@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });

        var todayDay = DateTime.UtcNow.DayOfWeek.ToString();
        var createResp = await pastor.PostAsJsonAsync("/api/attendance/meeting-types", new
        {
            title = "Demo Service",
            recurrenceKind = "Weekly",
            dayOfWeek = todayDay,
            scopeKind = "ChurchWide",
            opensDayOffset = 0,
            opensTimeUtc = "00:00:00",
            deadlineDayOffset = 1,
            deadlineTimeUtc = "23:59:00",
            autoGenerateWeeksAhead = 8,
            openNowForDemo = true,
        });

        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var meetingTypeId = (await createResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var occurrencesResp = await pastor.GetAsync($"/api/attendance/meeting-types/{meetingTypeId}/occurrences");
        var occurrences = await occurrencesResp.Content.ReadFromJsonAsync<JsonElement>();
        var todayKey = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var todayOccurrence = occurrences.EnumerateArray()
            .Single(e => e.GetProperty("meetingDate").GetString() == todayKey);

        Assert.Equal("Open", todayOccurrence.GetProperty("status").GetString());
        var opensAt = todayOccurrence.GetProperty("submissionOpensAt").GetDateTimeOffset();
        Assert.True(opensAt <= DateTimeOffset.UtcNow);

        var occurrenceId = todayOccurrence.GetProperty("id").GetGuid();
        var detailResp = await pastor.GetAsync($"/api/attendance/occurrences/{occurrenceId}");
        Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);
        var detail = await detailResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(detail.GetProperty("scopeSubmissions").GetArrayLength() >= 1);
        var unitNames = detail.GetProperty("scopeSubmissions").EnumerateArray()
            .Select(s => s.GetProperty("scopeUnitName").GetString())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Contains("Cell A", unitNames);
    }

    [Fact]
    public async Task Pastor_updates_meeting_type_title_and_submission_window()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Update Church" });

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
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var meetingTypeId = created.GetProperty("id").GetGuid();

        var patchResp = await pastor.PatchAsJsonAsync(
            $"/api/attendance/meeting-types/{meetingTypeId}",
            new
            {
                title = "Main Sunday Service",
                opensDayOffset = 0,
                opensTimeUtc = "15:00:00",
                deadlineDayOffset = 1,
                deadlineTimeUtc = "01:00:00",
            });
        Assert.Equal(HttpStatusCode.OK, patchResp.StatusCode);

        var list = await pastor.GetFromJsonAsync<JsonElement>("/api/attendance/meeting-types");
        var updated = list.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == meetingTypeId);
        Assert.Equal("Main Sunday Service", updated.GetProperty("title").GetString());
        Assert.Equal("15:00:00", updated.GetProperty("opensTimeUtc").GetString());
        Assert.Equal("01:00:00", updated.GetProperty("deadlineTimeUtc").GetString());
    }

    [Fact]
    public async Task Always_open_meeting_allows_cell_leader_submit_before_scheduled_open()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Always Open Church" });

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
                email = "jane.always@example.com",
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
                email = "bob.always@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });
        var cellId = (await cellResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
            email = "kay.always@example.com",
        });

        var createResp = await pastor.PostAsJsonAsync("/api/attendance/meeting-types", new
        {
            title = "Cell meeting",
            recurrenceKind = "Weekly",
            dayOfWeek = "Saturday",
            scopeKind = "ChurchWide",
            isAlwaysOpen = true,
            opensDayOffset = 0,
            opensTimeUtc = "21:00:00",
            deadlineDayOffset = 1,
            deadlineTimeUtc = "12:00:00",
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(created.GetProperty("isAlwaysOpen").GetBoolean());
        var meetingTypeId = created.GetProperty("id").GetGuid();

        var occurrences = await pastor.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/meeting-types/{meetingTypeId}/occurrences");
        Assert.True(occurrences.GetArrayLength() >= 1);
        var occurrenceId = occurrences[0].GetProperty("id").GetGuid();

        await using (var db = fx.CreateContext())
        {
            // Force a "closed" window on the occurrence — always-open must still allow edit.
            var occurrence = await db.AttendanceOccurrences.SingleAsync(o => o.Id == occurrenceId);
            occurrence.SubmissionOpensAt = DateTimeOffset.UtcNow.AddDays(2);
            occurrence.SubmissionDeadlineAt = DateTimeOffset.UtcNow.AddDays(3);
            occurrence.Status = AttendanceOccurrenceStatus.Scheduled;

            var submission = await db.AttendanceScopeSubmissions
                .SingleAsync(s => s.OccurrenceId == occurrenceId && s.ScopeNodeId == cellId);
            submission.LockStatus = AttendanceScopeLockStatus.Editable;
            await db.SaveChangesAsync();

            var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.always@example.com");
            Assert.NotNull(cellLeader.AuthUserId);

            var cellClient = _factory.CreateClient();
            cellClient.DefaultRequestHeaders.Add("X-Test-Sub", cellLeader.AuthUserId!.Value.ToString());
            cellClient.DefaultRequestHeaders.Add("X-Test-Email", "bob.always@example.com");
            cellClient.DefaultRequestHeaders.Add("X-Test-Name", "Bob Cell");

            var detail = await cellClient.GetFromJsonAsync<JsonElement>(
                $"/api/attendance/occurrences/{occurrenceId}");
            var memberIds = detail.GetProperty("entries")
                .EnumerateArray()
                .Select(e => e.GetProperty("memberId").GetGuid())
                .ToList();

            var putResp = await cellClient.PutAsJsonAsync(
                $"/api/attendance/occurrences/{occurrenceId}/scopes/{cellId}/entries",
                new
                {
                    entries = memberIds.Select(id => new { memberId = id, status = "Present" }).ToArray(),
                });
            Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);
        }
    }

    [Fact]
    public async Task Pastor_deletes_meeting_type_and_associated_occurrences()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Delete Church" });

        var createResp = await pastor.PostAsJsonAsync("/api/attendance/meeting-types", new
        {
            title = "Sunday Service",
            recurrenceKind = "Weekly",
            dayOfWeek = "Sunday",
            scopeKind = "ChurchWide",
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var meetingTypeId = created.GetProperty("id").GetGuid();

        var deleteResp = await pastor.DeleteAsync($"/api/attendance/meeting-types/{meetingTypeId}");
        Assert.Equal(HttpStatusCode.OK, deleteResp.StatusCode);

        await using var db = fx.CreateContext();
        Assert.False(await db.AttendanceMeetingTypes.AnyAsync(t => t.Id == meetingTypeId));
        Assert.False(await db.AttendanceOccurrences.AnyAsync(o => o.MeetingTypeId == meetingTypeId));
    }

    [Fact]
    public async Task Creating_meeting_type_notifies_leaders_and_admin_but_not_creator()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Notify Meeting Church" });

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

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.mtnotify@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.mtnotify@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });

        var adminResp = await pastor.PostAsJsonAsync("/api/settings/administrators", new
        {
            firstName = "Mary",
            lastName = "Admin",
            email = "mary.mtnotify@example.com",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        });
        Assert.Equal(HttpStatusCode.OK, adminResp.StatusCode);

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.mtnotify@example.com");
        var admin = await db.ChurchAdministrators.SingleAsync(a => a.Email == "mary.mtnotify@example.com");

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
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var meetingTypeId = (await createResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var pastorNotifications = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(0, pastorNotifications.GetProperty("unreadCount").GetInt32());

        var cellClient = ClientForAuthUser(
            cellLeader.AuthUserId!.Value,
            "bob.mtnotify@example.com",
            "Bob Cell");
        var cellNotifications = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, cellNotifications.GetProperty("unreadCount").GetInt32());
        var cellItem = cellNotifications.GetProperty("notifications")[0];
        Assert.Equal("MeetingTypeCreated", cellItem.GetProperty("kind").GetString());
        Assert.Contains("Sunday Service", cellItem.GetProperty("body").GetString());
        Assert.Equal("attendance/submissions", cellItem.GetProperty("linkPath").GetString());

        var adminClient = ClientForAuthUser(admin.AuthUserId, "mary.mtnotify@example.com", "Mary Admin");
        var adminNotifications = await adminClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, adminNotifications.GetProperty("unreadCount").GetInt32());
        Assert.Equal(
            "MeetingTypeCreated",
            adminNotifications.GetProperty("notifications")[0].GetProperty("kind").GetString());

        var patchResp = await pastor.PatchAsJsonAsync(
            $"/api/attendance/meeting-types/{meetingTypeId}",
            new
            {
                title = "Main Sunday Service",
                opensDayOffset = 0,
                opensTimeUtc = "15:00:00",
                deadlineDayOffset = 1,
                deadlineTimeUtc = "01:00:00",
            });
        Assert.Equal(HttpStatusCode.OK, patchResp.StatusCode);

        var afterEdit = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, afterEdit.GetProperty("unreadCount").GetInt32());
    }
}
