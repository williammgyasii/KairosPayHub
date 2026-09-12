using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceMeetingPackApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Pastor_can_publish_note_and_file()
    {
        var seed = await OpenSeedAsync();
        var publish = await PublishAsync(seed.PastorClient, seed.OccurrenceId, "Romans 8", "notes.pdf");
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
        var body = await publish.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Romans 8", body.GetProperty("note").GetString());
        Assert.Equal(1, body.GetProperty("files").GetArrayLength());
        Assert.False(body.GetProperty("files")[0].TryGetProperty("url", out _));
        Assert.False(body.GetProperty("files")[0].TryGetProperty("storageKey", out _));
    }

    [Fact]
    public async Task Empty_publish_is_400()
    {
        var seed = await OpenSeedAsync();
        using var content = new MultipartFormDataContent();
        var resp = await seed.PastorClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/pack",
            content);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Cell_leader_cannot_publish()
    {
        var seed = await OpenSeedAsync();
        var resp = await PublishAsync(seed.CellClient, seed.OccurrenceId, "Nope", "x.pdf");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Leader_seen_and_download_are_audited()
    {
        var seed = await OpenSeedAsync();
        var published = await (await PublishAsync(seed.PastorClient, seed.OccurrenceId, "Romans 8", "notes.pdf"))
            .Content.ReadFromJsonAsync<JsonElement>();
        var fileId = published.GetProperty("files")[0].GetProperty("id").GetGuid();

        var get = await seed.CellClient.GetAsync($"/api/attendance/occurrences/{seed.OccurrenceId}/pack");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var opened = await get.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(
            !opened.TryGetProperty("receipts", out var leaderReceipts)
            || leaderReceipts.ValueKind is JsonValueKind.Null);
        Assert.True(opened.GetProperty("viewerDownloadedAt").ValueKind is JsonValueKind.Null);

        var download = await seed.CellClient.GetAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/pack/files/{fileId}/download");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("application/pdf", download.Content.Headers.ContentType?.MediaType);
        var bytes = await download.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);

        var afterDownload = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/pack");
        Assert.NotNull(afterDownload.GetProperty("viewerDownloadedAt").GetString());

        var audit = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/pack");
        var bob = audit.GetProperty("receipts").EnumerateArray()
            .First(r => r.GetProperty("name").GetString() == "Bob Cell");
        Assert.NotNull(bob.GetProperty("seenAt").GetString());
        Assert.NotNull(bob.GetProperty("downloadedAt").GetString());
        var jane = audit.GetProperty("receipts").EnumerateArray()
            .First(r => r.GetProperty("name").GetString() == "Jane Fellowship");
        Assert.True(jane.GetProperty("seenAt").ValueKind is JsonValueKind.Null);
        Assert.True(jane.GetProperty("downloadedAt").ValueKind is JsonValueKind.Null);
    }

    [Fact]
    public async Task Church_wide_publish_notifies_leaders_not_members()
    {
        var seed = await OpenSeedAsync();
        var publish = await PublishAsync(seed.PastorClient, seed.OccurrenceId, "This week", "pack.pdf");
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);

        var janeInbox = await FellowshipInboxAsync();
        var pending = janeInbox.GetProperty("notifications").EnumerateArray()
            .First(n => n.GetProperty("kind").GetString() == "AttendanceMeetingPackPublished");
        Assert.Contains("Sunday Service", pending.GetProperty("body").GetString());

        var bobInbox = await seed.CellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Contains(
            bobInbox.GetProperty("notifications").EnumerateArray(),
            n => n.GetProperty("kind").GetString() == "AttendanceMeetingPackPublished");

        var pastorInbox = await seed.PastorClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.DoesNotContain(
            pastorInbox.GetProperty("notifications").EnumerateArray(),
            n => n.GetProperty("kind").GetString() == "AttendanceMeetingPackPublished");
    }

    [Fact]
    public async Task Unchanged_replace_does_not_notify_again()
    {
        var seed = await OpenSeedAsync();
        var first = await (await PublishAsync(seed.PastorClient, seed.OccurrenceId, "Same", "a.pdf"))
            .Content.ReadFromJsonAsync<JsonElement>();
        var fileId = first.GetProperty("files")[0].GetProperty("id").GetGuid();

        await using (var db = fx.CreateContext())
        {
            var notes = await db.Notifications.CountAsync(n =>
                n.Kind == KairosPayHub.Api.Domain.Notifications.NotificationKind.AttendanceMeetingPackPublished);
            Assert.True(notes >= 1);
        }

        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("Same"), "note");
        content.Add(new StringContent(fileId.ToString()), "keepFileIds");
        var again = await seed.PastorClient.PostAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/pack",
            content);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);

        var janeInbox = await FellowshipInboxAsync();
        var count = janeInbox.GetProperty("notifications").EnumerateArray()
            .Count(n => n.GetProperty("kind").GetString() == "AttendanceMeetingPackPublished");
        Assert.Equal(1, count);
    }

    private async Task<AttendanceTestSeed> OpenSeedAsync()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        await using var db = fx.CreateContext();
        var occurrence = await db.AttendanceOccurrences.SingleAsync(o => o.Id == seed.OccurrenceId);
        occurrence.SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-1);
        occurrence.Status = AttendanceOccurrenceStatus.Open;
        await db.SaveChangesAsync();
        return seed;
    }

    private static async Task<HttpResponseMessage> PublishAsync(
        HttpClient client,
        Guid occurrenceId,
        string note,
        string fileName)
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent(note), "note");
        var file = new ByteArrayContent("%PDF-1.4"u8.ToArray());
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(file, "files", fileName);
        return await client.PostAsync($"/api/attendance/occurrences/{occurrenceId}/pack", content);
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
}
