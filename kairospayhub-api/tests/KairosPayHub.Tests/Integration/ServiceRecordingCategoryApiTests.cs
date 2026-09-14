using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using KairosPayHub.Api.Streaming;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ServiceRecordingCategoryApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private const string WebhookSecret = "integration-webhook-secret";
    private const long LibraryId = 752627;

    private readonly ServiceRecordingCategoryApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Pastor_can_create_category_and_assign_on_upload()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var categoryResp = await seed.PastorClient.PostAsJsonAsync(
            "/api/service-recording-categories",
            new { name = "Sunday Services" });
        Assert.Equal(HttpStatusCode.OK, categoryResp.StatusCode);
        var category = await categoryResp.Content.ReadFromJsonAsync<JsonElement>();
        var categoryId = category.GetProperty("id").GetGuid();

        var create = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new
        {
            title = "Week 1",
            categoryId,
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var list = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            $"/api/service-recordings?categoryId={categoryId}");
        Assert.Equal(1, list.GetProperty("total").GetInt32());
        Assert.Equal(1, list.GetProperty("recordings").GetArrayLength());
        var item = list.GetProperty("recordings")[0];
        Assert.Equal("Sunday Services", item.GetProperty("category").GetProperty("name").GetString());
    }

    [Fact]
    public async Task Cell_leader_cannot_create_category()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var resp = await seed.CellClient.PostAsJsonAsync(
            "/api/service-recording-categories",
            new { name = "Nope" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Member_sees_categories_only_with_published_recordings()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        var training = await CreateCategoryAsync(seed.PastorClient, "Training Programs");
        var sunday = await CreateCategoryAsync(seed.PastorClient, "Sunday Services");

        var draft = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new
        {
            title = "Draft training",
            categoryId = training,
        });
        var draftBody = await draft.Content.ReadFromJsonAsync<JsonElement>();
        await MarkReadyViaWebhookAsync(draftBody.GetProperty("bunnyVideoGuid").GetString()!);

        var published = await seed.PastorClient.PostAsJsonAsync("/api/service-recordings", new
        {
            title = "Published service",
            categoryId = sunday,
        });
        var publishedBody = await published.Content.ReadFromJsonAsync<JsonElement>();
        var publishedId = publishedBody.GetProperty("id").GetGuid();
        await MarkReadyViaWebhookAsync(publishedBody.GetProperty("bunnyVideoGuid").GetString()!);
        await seed.PastorClient.PostAsync($"/api/service-recordings/{publishedId}/publish", null);

        var memberCategories = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            "/api/service-recording-categories");
        var names = memberCategories.GetProperty("categories")
            .EnumerateArray()
            .Select(c => c.GetProperty("name").GetString())
            .ToList();
        Assert.Equal(["Sunday Services"], names);
    }

    [Fact]
    public async Task Duplicate_category_name_is_rejected()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        await CreateCategoryAsync(seed.PastorClient, "Sunday Services");

        var dup = await seed.PastorClient.PostAsJsonAsync(
            "/api/service-recording-categories",
            new { name = "sunday services" });
        Assert.Equal(HttpStatusCode.BadRequest, dup.StatusCode);
    }

    private static async Task<Guid> CreateCategoryAsync(HttpClient client, string name)
    {
        var resp = await client.PostAsJsonAsync("/api/service-recording-categories", new { name });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("id").GetGuid();
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

    private sealed class ServiceRecordingCategoryApiFactory(string connectionString) : ApiFactory(connectionString)
    {
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
                services.AddSingleton<IBunnyStreamClient>(new FakeBunnyStreamClient());
            });
        }
    }
}
