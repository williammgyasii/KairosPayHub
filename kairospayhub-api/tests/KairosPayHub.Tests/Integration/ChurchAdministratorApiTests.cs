using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ChurchAdministratorApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Pastor_creates_external_admin_and_admin_can_create_giving_program()
    {
        var pastorSub = Guid.NewGuid();
        var pastor = AuthedClient(pastorSub, "pastor@grace.org", "Pastor Joe");
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Grace Church" });

        var createResp = await pastor.PostAsJsonAsync("/api/settings/administrators", new
        {
            firstName = "Mary",
            lastName = "Admin",
            email = "mary.admin@grace.org",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        await using var db = fx.CreateContext();
        var adminRow = await db.ChurchAdministrators.SingleAsync(a => a.Email == "mary.admin@grace.org");

        var adminClient = AuthedClient(adminRow.AuthUserId, "mary.admin@grace.org", "Mary Admin");
        var me = await adminClient.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal("ChurchAdmin", me.GetProperty("role").GetString());

        var programResp = await adminClient.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        Assert.Equal(HttpStatusCode.OK, programResp.StatusCode);
    }

    [Fact]
    public async Task Duplicate_admin_email_is_rejected()
    {
        var pastor = AuthedClient(Guid.NewGuid(), "pastor2@grace.org", "Pastor Two");
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Grace Two" });

        var body = new
        {
            firstName = "A",
            lastName = "B",
            email = "dup.admin@grace.org",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        };

        Assert.Equal(HttpStatusCode.OK, (await pastor.PostAsJsonAsync("/api/settings/administrators", body)).StatusCode);
        var dup = await pastor.PostAsJsonAsync("/api/settings/administrators", body);
        Assert.Equal(HttpStatusCode.BadRequest, dup.StatusCode);
    }

    [Fact]
    public async Task Suggest_email_returns_available_variant()
    {
        var pastor = AuthedClient(Guid.NewGuid(), "john@example.com", "John Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Example Church" });

        var resp = await pastor.PostAsJsonAsync("/api/settings/administrators/suggest-email", new
        {
            baseEmail = "john@example.com",
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("john.admin@example.com", json.GetProperty("email").GetString());
    }

    private HttpClient AuthedClient(Guid sub, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }
}
