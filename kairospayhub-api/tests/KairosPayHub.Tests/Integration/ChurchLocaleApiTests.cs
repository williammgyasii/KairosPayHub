using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ChurchLocaleApiTests(PostgresFixture fx) : IAsyncLifetime
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
    public async Task Countries_list_includes_canada_with_cad()
    {
        var client = PastorClient();
        var countries = await client.GetFromJsonAsync<JsonElement>("/api/onboarding/countries");
        var canada = countries.EnumerateArray()
            .First(c => c.GetProperty("code").GetString() == "CA");
        Assert.Equal("Canada", canada.GetProperty("name").GetString());
        Assert.Equal("CAD", canada.GetProperty("currency").GetString());
    }

    [Fact]
    public async Task Onboarding_without_country_is_rejected()
    {
        var client = PastorClient();
        var response = await client.PostAsJsonAsync("/api/onboarding", new { churchName = "No Country Church" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Onboarding_with_canada_sets_cad_on_church_and_me()
    {
        var client = PastorClient();
        var response = await client.PostAsJsonAsync(
            "/api/onboarding",
            new { churchName = "Maple Church", countryCode = "CA" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal("CA", me.GetProperty("countryCode").GetString());
        Assert.Equal("CAD", me.GetProperty("defaultCurrency").GetString());

        await using var db = fx.CreateContext();
        var churchId = me.GetProperty("churchId").GetGuid();
        var church = await db.StructureChurches.SingleAsync(c => c.Id == churchId);
        Assert.Equal("CA", church.CountryCode);
        Assert.Equal("CAD", church.DefaultCurrency);
    }

    [Fact]
    public async Task Contribution_without_currency_uses_church_default()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync(
            "/api/onboarding",
            new { churchName = "CAD Giving Church", countryCode = "CA" });

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
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.fellowship@example.com",
                phone = "+14165550100",
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
                phone = "+14165550101",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });
        var cellId = (await cellResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var memberResp = await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
            email = "kay@example.com",
        });
        var memberId = (await memberResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.cell@example.com");
        Assert.NotNull(cellLeader.AuthUserId);

        var programResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var programId = (await programResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var cellClient = _factory.CreateClient();
        cellClient.DefaultRequestHeaders.Add("X-Test-Sub", cellLeader.AuthUserId!.Value.ToString());
        cellClient.DefaultRequestHeaders.Add("X-Test-Email", "bob.cell@example.com");
        cellClient.DefaultRequestHeaders.Add("X-Test-Name", "Bob Cell");

        var create = await cellClient.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
        {
            memberId,
            amount = 50m,
            dateSent = "2026-08-01T00:00:00Z",
            attachmentKey = "giving/test/receipt.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var contribution = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("CAD", contribution.GetProperty("currency").GetString());
    }
}
