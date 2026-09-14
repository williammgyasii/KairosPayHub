using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.Streaming;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ServiceRecordingApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private const string WebhookSecret = "integration-webhook-secret";
    private const long LibraryId = 752627;

    private readonly ServiceRecordingApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Pastor_can_create_recording_with_upload_target()
    {
        var seed = await SeedPastorAsync();
        var resp = await seed.Client.PostAsJsonAsync("/api/service-recordings", new
        {
            title = "Sunday Service",
            description = "Week 1",
            serviceDate = "2026-09-07",
        });

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Sunday Service", body.GetProperty("title").GetString());
        Assert.Equal("Draft", body.GetProperty("status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("bunnyVideoGuid").GetString()));
        Assert.Equal("https://video.bunnycdn.com/tusupload", body.GetProperty("tusEndpoint").GetString());
        Assert.Equal(LibraryId, body.GetProperty("tusLibraryId").GetInt64());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("tusSignature").GetString()));
        Assert.True(body.GetProperty("tusExpiresUnix").GetInt64() > DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        Assert.False(body.TryGetProperty("uploadAccessKey", out _));
    }

    [Fact]
    public async Task Cell_leader_cannot_create_recording()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var resp = await seed.CellClient.PostAsJsonAsync("/api/service-recordings", new { title = "Nope" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Webhook_updates_recording_status_when_signature_valid()
    {
        var seed = await SeedPastorAsync();
        var create = await seed.Client.PostAsJsonAsync("/api/service-recordings", new { title = "Webhook test" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        var videoGuid = created.GetProperty("bunnyVideoGuid").GetString()!;

        const string payload = """{"VideoLibraryId":752627,"VideoGuid":"PLACEHOLDER","Status":3}""";
        var body = payload.Replace("PLACEHOLDER", videoGuid, StringComparison.Ordinal);
        var signature = BunnyStreamWebhookVerifier.ComputeSignature(body, WebhookSecret);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/bunny-stream")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-BunnyStream-Signature", signature);
        request.Headers.Add("X-BunnyStream-Signature-Version", "v1");
        request.Headers.Add("X-BunnyStream-Signature-Algorithm", "hmac-sha256");

        var webhook = await _factory.CreateClient().SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, webhook.StatusCode);

        await using var db = fx.CreateContext();
        var recording = await db.ChurchServiceRecordings.SingleAsync(r => r.Id == recordingId);
        Assert.Equal(ServiceRecordingStatus.Ready, recording.Status);
        Assert.Equal(3600, recording.DurationSeconds);
    }

    [Fact]
    public async Task Pastor_lists_draft_member_sees_only_published()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new { title = "Draft service" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);

        var pastorList = await seed.PastorClient.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        Assert.Equal(1, pastorList.GetProperty("recordings").GetArrayLength());

        var memberList = await seed.CellClient.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        Assert.Equal(0, memberList.GetProperty("recordings").GetArrayLength());

        var publish = await seed.PastorClient.PostAsync($"/api/service-recordings/{recordingId}/publish", null);
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);

        memberList = await seed.CellClient.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        Assert.Equal(1, memberList.GetProperty("recordings").GetArrayLength());
    }

    [Fact]
    public async Task Publish_notifies_members_with_login_not_publisher()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new { title = "Sunday Service" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);

        var publish = await seed.PastorClient.PostAsync($"/api/service-recordings/{recordingId}/publish", null);
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);

        var memberInbox = await seed.CellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        var notification = memberInbox.GetProperty("notifications").EnumerateArray()
            .First(n => n.GetProperty("kind").GetString() == "ServiceRecordingPublished");
        Assert.Equal("New service recording", notification.GetProperty("title").GetString());
        Assert.Contains("Sunday Service", notification.GetProperty("body").GetString());
        Assert.Equal($"media/recordings/{recordingId}", notification.GetProperty("linkPath").GetString());

        var pastorInbox = await seed.PastorClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.DoesNotContain(
            pastorInbox.GetProperty("notifications").EnumerateArray(),
            n => n.GetProperty("kind").GetString() == "ServiceRecordingPublished");
    }

    [Fact]
    public async Task Pastor_can_preview_playback_before_publish()
    {
        var pastor = await SeedPastorAsync();
        var create = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "Preview me" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);

        var playback = await pastor.Client.GetAsync($"/api/service-recordings/{recordingId}/playback");
        Assert.Equal(HttpStatusCode.OK, playback.StatusCode);
        var body = await playback.Content.ReadFromJsonAsync<JsonElement>();
        Assert.StartsWith("https://iframe.mediadelivery.net/embed/", body.GetProperty("embedUrl").GetString());
        Assert.True(body.GetProperty("expiresAtUnix").GetInt64() > DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    }

    [Fact]
    public async Task Member_gets_playback_for_published_recording_only()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new { title = "Published service" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);

        var blocked = await seed.CellClient.GetAsync($"/api/service-recordings/{recordingId}/playback");
        Assert.Equal(HttpStatusCode.NotFound, blocked.StatusCode);

        await seed.PastorClient.PostAsync($"/api/service-recordings/{recordingId}/publish", null);

        var allowed = await seed.CellClient.GetAsync($"/api/service-recordings/{recordingId}/playback");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    [Fact]
    public async Task Unpublished_recording_is_not_found_for_members()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new { title = "Hidden" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);

        var detail = await seed.CellClient.GetAsync($"/api/service-recordings/{recordingId}");
        Assert.Equal(HttpStatusCode.NotFound, detail.StatusCode);
    }

    [Fact]
    public async Task Pastor_can_unpublish_and_delete()
    {
        var pastor = await SeedPastorAsync();
        var create = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "Temporary" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        var videoGuid = created.GetProperty("bunnyVideoGuid").GetString()!;
        await MarkReadyViaWebhookAsync(videoGuid);
        await pastor.Client.PostAsync($"/api/service-recordings/{recordingId}/publish", null);

        var unpublish = await pastor.Client.PostAsync($"/api/service-recordings/{recordingId}/unpublish", null);
        Assert.Equal(HttpStatusCode.OK, unpublish.StatusCode);
        var body = await unpublish.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("publishedAt").ValueKind is JsonValueKind.Null);

        var delete = await pastor.Client.DeleteAsync($"/api/service-recordings/{recordingId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        await using var db = fx.CreateContext();
        Assert.False(await db.ChurchServiceRecordings.AnyAsync(r => r.Id == recordingId));
    }

    [Fact]
    public async Task List_syncs_encoding_status_from_bunny_without_webhook()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new { title = "Sync test" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();

        var pastorList = await seed.PastorClient.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        var item = pastorList.GetProperty("recordings").EnumerateArray().Single();
        Assert.Equal("Ready", item.GetProperty("status").GetString());

        var memberList = await seed.CellClient.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        Assert.Equal(0, memberList.GetProperty("recordings").GetArrayLength());

        await seed.PastorClient.PostAsync($"/api/service-recordings/{recordingId}/publish", null);

        memberList = await seed.CellClient.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        Assert.Equal(1, memberList.GetProperty("recordings").GetArrayLength());
    }

    [Fact]
    public async Task Playback_increments_play_count()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new { title = "Counted" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);
        await seed.PastorClient.PostAsync($"/api/service-recordings/{recordingId}/publish", null);

        Assert.Equal(HttpStatusCode.OK, (await seed.CellClient.GetAsync($"/api/service-recordings/{recordingId}/playback")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await seed.CellClient.GetAsync($"/api/service-recordings/{recordingId}/playback")).StatusCode);

        var detail = await seed.PastorClient.GetFromJsonAsync<JsonElement>($"/api/service-recordings/{recordingId}");
        Assert.Equal(2, detail.GetProperty("playCount").GetInt32());
    }

    [Fact]
    public async Task Pastor_can_upload_custom_thumbnail()
    {
        var pastor = await SeedPastorAsync();
        var create = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "With cover" });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();

        var upload = await pastor.Client.PostAsync(
            $"/api/service-recordings/{recordingId}/thumbnail",
            ThumbnailForm());
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        var body = await upload.Content.ReadFromJsonAsync<JsonElement>();
        Assert.StartsWith("https://fake.test/", body.GetProperty("thumbnailUrl").GetString());

        var list = await pastor.Client.GetFromJsonAsync<JsonElement>("/api/service-recordings");
        var item = list.GetProperty("recordings").EnumerateArray().Single();
        Assert.Equal(body.GetProperty("thumbnailUrl").GetString(), item.GetProperty("thumbnailUrl").GetString());
    }

    [Fact]
    public async Task Pastor_can_search_filter_by_series_and_update_recording()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var categoryResp = await seed.PastorClient.PostAsJsonAsync(
            "/api/service-recording-categories",
            new { name = "Sunday Services" });
        var categoryId = (await categoryResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var seriesResp = await seed.PastorClient.PostAsJsonAsync(
            "/api/service-recording-series",
            new { name = "Faith Over Fear" });
        var seriesId = (await seriesResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new
        {
            title = "Week 1 sermon",
            description = "Opening message",
            categoryId,
            seriesId,
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var recordingId = created.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(created.GetProperty("bunnyVideoGuid").GetString()!);

        var filtered = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            $"/api/service-recordings?seriesId={seriesId}");
        Assert.Equal(1, filtered.GetProperty("total").GetInt32());
        var item = filtered.GetProperty("recordings")[0];
        Assert.Equal("Faith Over Fear", item.GetProperty("series").GetProperty("name").GetString());

        var search = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            "/api/service-recordings?q=sermon");
        Assert.Equal(1, search.GetProperty("total").GetInt32());

        var patch = await seed.PastorClient.PatchAsJsonAsync(
            $"/api/service-recordings/{recordingId}",
            new
            {
                title = "Week 1 — Faith Over Fear",
                description = "Updated notes",
                serviceDate = "2026-09-07",
                categoryId,
                seriesId,
            });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = await patch.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Week 1 — Faith Over Fear", updated.GetProperty("title").GetString());
        Assert.Equal("Updated notes", updated.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Pastor_cannot_create_duplicate_title()
    {
        var pastor = await SeedPastorAsync();
        var first = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "Sunday Service" });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var duplicate = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "sunday service" });
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task Pastor_cannot_rename_to_existing_title()
    {
        var pastor = await SeedPastorAsync();
        var first = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "Week 1" });
        var second = await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = "Week 2" });
        var secondId = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var patch = await pastor.Client.PatchAsJsonAsync(
            $"/api/service-recordings/{secondId}",
            new { title = "week 1" });
        Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);
    }

    [Fact]
    public async Task List_is_paginated()
    {
        var pastor = await SeedPastorAsync();
        for (var i = 1; i <= 3; i++)
        {
            await pastor.Client.PostAsJsonAsync("/api/service-recordings", new { title = $"Service {i}" });
        }

        var page1 = await pastor.Client.GetFromJsonAsync<JsonElement>(
            "/api/service-recordings?page=1&pageSize=2");
        Assert.Equal(3, page1.GetProperty("total").GetInt32());
        Assert.Equal(2, page1.GetProperty("recordings").GetArrayLength());
        Assert.Equal(1, page1.GetProperty("page").GetInt32());
        Assert.Equal(2, page1.GetProperty("pageSize").GetInt32());

        var page2 = await pastor.Client.GetFromJsonAsync<JsonElement>(
            "/api/service-recordings?page=2&pageSize=2");
        Assert.Equal(1, page2.GetProperty("recordings").GetArrayLength());
    }

    [Fact]
    public async Task Webhook_rejects_invalid_signature()
    {
        const string body = """{"VideoLibraryId":752627,"VideoGuid":"missing","Status":3}""";
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/bunny-stream")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-BunnyStream-Signature", new string('a', 64));
        request.Headers.Add("X-BunnyStream-Signature-Version", "v1");
        request.Headers.Add("X-BunnyStream-Signature-Algorithm", "hmac-sha256");

        var resp = await _factory.CreateClient().SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    private async Task<PastorSeed> SeedPastorAsync()
    {
        var pastorSub = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", pastorSub.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "pastor.recordings@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");

        await client.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Recordings Church" });
        await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        return new PastorSeed(client);
    }

    private async Task MarkReadyViaWebhookAsync(string videoGuid)
    {
        var body = $$"""{"VideoLibraryId":752627,"VideoGuid":"{{videoGuid}}","Status":3}""";
        var signature = BunnyStreamWebhookVerifier.ComputeSignature(body, WebhookSecret);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/webhooks/bunny-stream")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("X-BunnyStream-Signature", signature);
        request.Headers.Add("X-BunnyStream-Signature-Version", "v1");
        request.Headers.Add("X-BunnyStream-Signature-Algorithm", "hmac-sha256");
        var resp = await _factory.CreateClient().SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    private static MultipartFormDataContent ThumbnailForm()
    {
        var bytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, "file", "cover.png");
        return content;
    }

    private sealed record PastorSeed(HttpClient Client);

    private sealed class ServiceRecordingApiFactory(string connectionString) : ApiFactory(connectionString)
    {
        public FakeBunnyStreamClient Bunny { get; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.UseSetting("FeatureFlags:ServiceRecordings:Enabled", "true");
            builder.UseSetting("BunnyStream:LibraryId", LibraryId.ToString());
            builder.UseSetting("BunnyStream:ApiKey", "test-library-key");
            builder.UseSetting("BunnyStream:WebhookSecret", WebhookSecret);
            builder.UseSetting("BunnyStream:TokenSecurityKey", "test-token-security-key");

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IBunnyStreamClient>();
                services.AddSingleton<IBunnyStreamClient>(Bunny);
            });
        }
    }
}
