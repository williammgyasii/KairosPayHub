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

    [Fact]
    public async Task Pastor_creates_weekly_sunday_meeting_type_with_auto_generated_occurrences()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Attendance Church" });

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
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Demo Church" });

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
            deadlineDayOffset = 2,
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
        Assert.Equal("Cell A", detail.GetProperty("scopeSubmissions")[0].GetProperty("scopeUnitName").GetString());
    }

    [Fact]
    public async Task Pastor_updates_meeting_type_title_and_submission_window()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Update Church" });

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
    public async Task Pastor_deletes_meeting_type_and_associated_occurrences()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Delete Church" });

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
}
