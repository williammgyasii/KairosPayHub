using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class CampaignSubCampaignApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "campaign@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        return client;
    }

    [Fact]
    public async Task Scheduled_main_campaign_is_not_live_until_go_live()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Schedule Church" });

        var future = DateTimeOffset.UtcNow.AddDays(3);
        var create = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Sunday Services 2026",
            startsOn = "2026-01-01",
            endsOn = "2026-12-31",
            goLiveAt = future.ToString("o"),
            scopeKind = "ChurchWide",
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var body = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Scheduled", body.GetProperty("status").GetString());
        Assert.False(body.GetProperty("acceptsContributions").GetBoolean());
    }

    [Fact]
    public async Task Batch_creates_weekly_sub_campaigns_with_log_window()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Batch Church" });

        var rootId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Sunday Services",
            startsOn = "2026-02-01",
            endsOn = "2026-02-28",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var preview = await pastor.PostAsJsonAsync(
            $"/api/giving/programs/{rootId}/sub-campaigns/preview",
            new
            {
                frequency = "Weekly",
                dayOfWeek = 0,
                rangeStart = "2026-02-01",
                rangeEnd = "2026-02-28",
                logOpensOffsetDays = 1,
            });
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        var previewBody = await preview.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(4, previewBody.GetProperty("count").GetInt32());

        var batch = await pastor.PostAsJsonAsync(
            $"/api/giving/programs/{rootId}/sub-campaigns/batch",
            new
            {
                frequency = "Weekly",
                dayOfWeek = 0,
                rangeStart = "2026-02-01",
                rangeEnd = "2026-02-28",
                logOpensOffsetDays = 1,
            });
        Assert.Equal(HttpStatusCode.OK, batch.StatusCode);
        var batchBody = await batch.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(4, batchBody.GetProperty("programs").GetArrayLength());

        var children = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/children");
        Assert.Equal(4, children.GetProperty("programs").GetArrayLength());
        Assert.Equal(
            "2026-02-01",
            children.GetProperty("programs")[0].GetProperty("eventDate").GetString());
    }
}
