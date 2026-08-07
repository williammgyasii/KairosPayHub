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
    public async Task Pastor_creates_church_submits_and_lists_record()
    {
        var client = AuthedClient(Guid.NewGuid().ToString(), "p2@example.com", "Pastor Two");
        await client.PostAsJsonAsync("/api/onboarding", new { churchName = "Org Two" });

        var churchResp = await client.PostAsJsonAsync("/api/churches", new { name = "Avenue" });
        var church = await churchResp.Content.ReadFromJsonAsync<JsonElement>();
        var churchId = church.GetProperty("id").GetGuid();

        var submit = await client.PostAsJsonAsync("/api/records", new
        {
            churchId,
            amount = 250.50m,
            dateSent = "2026-07-01T00:00:00Z",
            method = "Cash",
        });
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);

        var list = await client.GetFromJsonAsync<JsonElement>("/api/records");
        Assert.Equal(1, list.GetArrayLength());
        Assert.Equal(250.50m, list[0].GetProperty("amount").GetDecimal());
    }

    [Fact]
    public async Task Leader_cannot_verify_is_403()
    {
        var org = Seed.Org();
        var church = Seed.Church(org);
        var leader = Seed.User(org, Role.Leader, church, "leader@example.com");
        leader.AuthSubject = "leader-sub";
        await using (var db = _fx.CreateContext())
        {
            db.AddRange(org, church, leader);
            await db.SaveChangesAsync();
        }

        var client = AuthedClient("leader-sub", "leader@example.com", "Leader");
        var submit = await client.PostAsJsonAsync("/api/records", new
        {
            churchId = church.Id,
            amount = 100m,
            dateSent = "2026-07-01T00:00:00Z",
            method = "MobileMoney",
        });
        var record = await submit.Content.ReadFromJsonAsync<JsonElement>();
        var recordId = record.GetProperty("id").GetGuid();

        var verify = await client.PostAsync($"/api/records/{recordId}/verify", null);
        Assert.Equal(HttpStatusCode.Forbidden, verify.StatusCode);
    }
}
