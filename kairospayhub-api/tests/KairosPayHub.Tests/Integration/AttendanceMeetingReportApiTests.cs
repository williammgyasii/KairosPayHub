using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceMeetingReportApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Create_with_requires_report_seeds_default_schema()
    {
        var pastor = await OnboardPastorAsync("Report Seed Church");
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
            requiresReport = true,
        });

        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(created.GetProperty("requiresReport").GetBoolean());
        AssertDefaultSchema(created.GetProperty("reportSchema"));
    }

    [Fact]
    public async Task Update_can_replace_prompts_with_long_text_and_photos_only()
    {
        var pastor = await OnboardPastorAsync("Report Replace Church");
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
            requiresReport = true,
        });
        var meetingTypeId = (await createResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var patchResp = await pastor.PatchAsJsonAsync(
            $"/api/attendance/meeting-types/{meetingTypeId}",
            new
            {
                title = "Sunday Service",
                opensDayOffset = 0,
                opensTimeUtc = "14:00:00",
                deadlineDayOffset = 1,
                deadlineTimeUtc = "00:00:00",
                requiresReport = true,
                reportSchema = new[]
                {
                    new { id = "word", kind = "longText", label = "The word", required = true },
                    new { id = "shots", kind = "photos", label = "Evidence", required = true },
                },
            });
        Assert.Equal(HttpStatusCode.OK, patchResp.StatusCode);
        var updated = await patchResp.Content.ReadFromJsonAsync<JsonElement>();
        var schema = updated.GetProperty("reportSchema");
        Assert.Equal(2, schema.GetArrayLength());
        Assert.Equal("The word", schema[0].GetProperty("label").GetString());
        Assert.Equal("photos", schema[1].GetProperty("kind").GetString());

        var rejected = await pastor.PatchAsJsonAsync(
            $"/api/attendance/meeting-types/{meetingTypeId}",
            new
            {
                title = "Sunday Service",
                opensDayOffset = 0,
                opensTimeUtc = "14:00:00",
                deadlineDayOffset = 1,
                deadlineTimeUtc = "00:00:00",
                requiresReport = true,
                reportSchema = new[]
                {
                    new { id = "yesno", kind = "dropdown", label = "Was it good?", required = true },
                },
            });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
    }

    [Fact]
    public async Task Create_without_flag_stores_no_required_report()
    {
        var pastor = await OnboardPastorAsync("No Report Church");
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
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(created.GetProperty("requiresReport").GetBoolean());
        Assert.Equal(0, created.GetProperty("reportSchema").GetArrayLength());
    }

    [Fact]
    public async Task Anonymous_create_is_401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/attendance/meeting-types", new
        {
            title = "Sunday Service",
            recurrenceKind = "Weekly",
            dayOfWeek = "Sunday",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Submit_without_complete_report_is_400_and_stays_draft()
    {
        var seed = await OpenReportSeedAsync();
        await MarkAllPresentAsync(seed);

        var submitResp = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/submit",
            new { reportAnswers = new { taught = "Romans 8" } });
        Assert.Equal(HttpStatusCode.BadRequest, submitResp.StatusCode);

        await using var db = fx.CreateContext();
        var submission = await db.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(AttendanceScopeApprovalStatus.Draft, submission.ApprovalStatus);
    }

    [Fact]
    public async Task Submit_with_required_text_and_photo_is_pending()
    {
        var seed = await OpenReportSeedAsync();
        await MarkAllPresentAsync(seed);
        var photoUrl = await UploadPhotoAsync(seed);

        var submitResp = await seed.CellClient.PostAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/submit",
            new
            {
                reportAnswers = new
                {
                    taught = "Romans 8",
                    shared = "Testimony",
                    photos = new[] { photoUrl },
                },
            });
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        var detail = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}");
        var report = detail.GetProperty("scopeSubmissions")[0].GetProperty("report");
        Assert.Equal("What was taught", report.GetProperty("schema")[0].GetProperty("label").GetString());
        Assert.Equal("Romans 8", report.GetProperty("answers").GetProperty("taught").GetString());
        Assert.Equal(photoUrl, report.GetProperty("answers").GetProperty("photos")[0].GetString());

        await using var db = fx.CreateContext();
        var submission = await db.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(AttendanceScopeApprovalStatus.PendingApproval, submission.ApprovalStatus);
        Assert.False(string.IsNullOrWhiteSpace(submission.ReportPayload));

        var inbox = await FellowshipInboxAsync();
        var pending = inbox.GetProperty("notifications").EnumerateArray()
            .First(n => n.GetProperty("kind").GetString() == "AttendancePendingApproval");
        Assert.Equal("Cell A meeting report awaiting approval", pending.GetProperty("title").GetString());
        Assert.Equal(
            "Bob Cell · Cell Leader submitted the Cell A meeting report for Sunday Service.",
            pending.GetProperty("body").GetString());
    }

    [Fact]
    public async Task Save_draft_with_partial_report_succeeds()
    {
        var seed = await OpenReportSeedAsync();
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
                reportAnswers = new { taught = "Partial notes" },
            });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        var after = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}");
        var report = after.GetProperty("scopeSubmissions")[0].GetProperty("report");
        Assert.Equal("Partial notes", report.GetProperty("answers").GetProperty("taught").GetString());

        await using var db = fx.CreateContext();
        var submission = await db.AttendanceScopeSubmissions.AsNoTracking()
            .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
        Assert.Equal(AttendanceScopeApprovalStatus.Draft, submission.ApprovalStatus);
    }

    [Fact]
    public async Task No_report_type_still_submits()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        await OpenWindowAsync(seed);

        var detail = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}");
        var memberIds = detail.GetProperty("entries")
            .EnumerateArray()
            .Select(e => e.GetProperty("memberId").GetGuid())
            .ToList();
        await seed.CellClient.PutAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/entries",
            new { entries = memberIds.Select(id => new { memberId = id, status = "Present" }).ToArray() });

        var submitResp = await seed.CellClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/submit",
            null);
        Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

        var inbox = await FellowshipInboxAsync();
        var pending = inbox.GetProperty("notifications").EnumerateArray()
            .First(n => n.GetProperty("kind").GetString() == "AttendancePendingApproval");
        Assert.Equal("Cell A roll call awaiting approval", pending.GetProperty("title").GetString());
        Assert.Equal(
            "Bob Cell · Cell Leader submitted the Cell A roll call for Sunday Service.",
            pending.GetProperty("body").GetString());
    }

    private async Task<JsonElement> FellowshipInboxAsync()
    {
        await using var db = fx.CreateContext();
        var leader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship@example.com");
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", leader.AuthUserId!.Value.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "jane.fellowship@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Jane Fellowship");
        return (await client.GetFromJsonAsync<JsonElement>("/api/notifications"))!;
    }

    private async Task<HttpClient> OnboardPastorAsync(string churchName)
    {
        var pastor = _factory.CreateClient();
        pastor.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        pastor.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        pastor.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName });
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });
        return pastor;
    }

    private async Task<AttendanceTestSeed> OpenReportSeedAsync()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var patch = await seed.PastorClient.PatchAsJsonAsync(
            $"/api/attendance/meeting-types/{seed.MeetingTypeId}",
            new
            {
                title = "Sunday Service",
                opensDayOffset = 0,
                opensTimeUtc = "14:00:00",
                deadlineDayOffset = 1,
                deadlineTimeUtc = "00:00:00",
                requiresReport = true,
            });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        await OpenWindowAsync(seed);
        return seed;
    }

    private async Task OpenWindowAsync(AttendanceTestSeed seed)
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

    private static async Task MarkAllPresentAsync(AttendanceTestSeed seed)
    {
        var detail = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}");
        var memberIds = detail.GetProperty("entries")
            .EnumerateArray()
            .Select(e => e.GetProperty("memberId").GetGuid())
            .ToList();
        var put = await seed.CellClient.PutAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/entries",
            new { entries = memberIds.Select(id => new { memberId = id, status = "Present" }).ToArray() });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
    }

    private static async Task<string> UploadPhotoAsync(AttendanceTestSeed seed)
    {
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xDB, 0x00]);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(file, "file", "shot.jpg");
        var resp = await seed.CellClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/report-photos",
            content);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("url").GetString()!;
    }

    private static void AssertDefaultSchema(JsonElement schema)
    {
        Assert.Equal(4, schema.GetArrayLength());
        Assert.Equal("taught", schema[0].GetProperty("id").GetString());
        Assert.Equal("What was taught", schema[0].GetProperty("label").GetString());
        Assert.Equal("shared", schema[1].GetProperty("id").GetString());
        Assert.Equal("prayer", schema[2].GetProperty("id").GetString());
        Assert.False(schema[2].GetProperty("required").GetBoolean());
        Assert.Equal("photos", schema[3].GetProperty("kind").GetString());
        Assert.True(schema[3].GetProperty("required").GetBoolean());
    }
}
