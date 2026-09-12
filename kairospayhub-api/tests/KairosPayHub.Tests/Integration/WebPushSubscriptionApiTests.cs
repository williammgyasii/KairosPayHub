using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Notifications;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class WebPushSubscriptionApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        return client;
    }

    [Fact]
    public async Task Signed_in_user_can_upsert_and_delete_a_subscription()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Push Church" });

        var put = await pastor.PutAsJsonAsync("/api/notifications/push/subscriptions", new
        {
            endpoint = "https://push.example/device-a",
            p256dh = "p256dh-a",
            auth = "auth-a",
        });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var listed = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications/push/subscriptions");
        Assert.Contains(
            listed.GetProperty("subscriptions").EnumerateArray(),
            s => s.GetProperty("endpoint").GetString() == "https://push.example/device-a");

        var delete = await pastor.DeleteAsync(
            "/api/notifications/push/subscriptions?endpoint=" + Uri.EscapeDataString("https://push.example/device-a"));
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        var afterDelete = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications/push/subscriptions");
        Assert.Empty(afterDelete.GetProperty("subscriptions").EnumerateArray());
    }

    [Fact]
    public async Task Anonymous_put_is_rejected()
    {
        var anon = _factory.CreateClient();
        var put = await anon.PutAsJsonAsync("/api/notifications/push/subscriptions", new
        {
            endpoint = "https://push.example/anon",
            p256dh = "p256dh",
            auth = "auth",
        });
        Assert.Equal(HttpStatusCode.Unauthorized, put.StatusCode);
    }

    [Fact]
    public async Task Second_device_endpoint_stays_stored()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Two Device Church" });

        await pastor.PutAsJsonAsync("/api/notifications/push/subscriptions", new
        {
            endpoint = "https://push.example/phone",
            p256dh = "p256dh-phone",
            auth = "auth-phone",
        });
        await pastor.PutAsJsonAsync("/api/notifications/push/subscriptions", new
        {
            endpoint = "https://push.example/laptop",
            p256dh = "p256dh-laptop",
            auth = "auth-laptop",
        });

        var listed = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications/push/subscriptions");
        var endpoints = listed.GetProperty("subscriptions")
            .EnumerateArray()
            .Select(s => s.GetProperty("endpoint").GetString())
            .ToHashSet();
        Assert.Contains("https://push.example/phone", endpoints);
        Assert.Contains("https://push.example/laptop", endpoints);
    }

    [Fact]
    public async Task Missing_vapid_keys_return_503_not_500()
    {
        await using var factory = new NoVapidApiFactory(fx.ConnectionString);
        var pastor = factory.CreateClient();
        pastor.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        pastor.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        pastor.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Vapid Church" });

        var response = await pastor.GetAsync("/api/notifications/push/vapid-key");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
    }

    private sealed class NoVapidApiFactory(string connectionString) : ApiFactory(connectionString)
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureTestServices(services =>
            {
                services.PostConfigure<WebPushOptions>(options =>
                {
                    options.PublicKey = "";
                    options.PrivateKey = "";
                });
            });
        }
    }
}
