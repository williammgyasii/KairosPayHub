using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ApiTests : IAsyncLifetime
{
    private readonly PostgresFixture _fx;
    private readonly ApiFactory _factory;

    public ApiTests(PostgresFixture fx)
    {
        _fx = fx;
        _factory = new ApiFactory(fx.ConnectionString);
    }

    public Task InitializeAsync() => _fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient AuthedClient(string sub, string email = "user@example.com", string name = "User")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    [Fact]
    public async Task Unauthenticated_request_is_401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task New_user_is_not_onboarded()
    {
        var client = AuthedClient(Guid.NewGuid().ToString());
        var json = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.False(json.GetProperty("onboarded").GetBoolean());
    }

    [Fact]
    public async Task Pastor_onboards_then_me_shows_pastor()
    {
        var sub = Guid.NewGuid().ToString();
        var client = AuthedClient(sub, "pastor@example.com", "Pastor Joe");

        var onboard = await client.PostAsJsonAsync(
            "/api/onboarding", new { churchName = "Grace Church" });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(me.GetProperty("onboarded").GetBoolean());
        Assert.Equal("Pastor", me.GetProperty("role").GetString());
        Assert.Equal("Grace Church", me.GetProperty("churchName").GetString());
    }

    [Fact]
    public async Task Pastor_onboards_and_lists_giving_programs_empty()
    {
        var client = AuthedClient(Guid.NewGuid().ToString(), "p2@example.com", "Pastor Two");
        await client.PostAsJsonAsync("/api/onboarding", new { churchName = "Org Two" });

        var list = await client.GetFromJsonAsync<JsonElement>("/api/giving/programs");
        Assert.Equal(0, list.GetProperty("programs").GetArrayLength());
    }
}
