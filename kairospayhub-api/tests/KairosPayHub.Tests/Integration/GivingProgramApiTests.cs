using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class GivingProgramApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient(string? sub = null)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub ?? Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        return client;
    }

    private HttpClient ClientForAuthUser(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    private static async Task OnboardAsync(HttpClient client, string churchName = "Grace Assembly")
    {
        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { churchName });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);
    }

    [Fact]
    public async Task Pastor_creates_church_wide_rhapsody_program()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var response = await client.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Rhapsody 2026", body.GetProperty("title").GetString());
        Assert.Equal("Rhapsody", body.GetProperty("givingType").GetString());
        Assert.Equal("2026", body.GetProperty("periodLabel").GetString());
        Assert.Equal("ChurchWide", body.GetProperty("scopeKind").GetString());
        Assert.Equal("Open", body.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Pastor_cannot_create_duplicate_church_wide_rhapsody_for_same_period()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var first = await client.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var duplicate = await client.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026 duplicate",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task Fellowship_leader_cannot_create_church_wide_program()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "PFCC", displayName = "PFCC" },
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var pfccId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var createFellowship = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.leader@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        });
        Assert.Equal(HttpStatusCode.OK, createFellowship.StatusCode);

        await using var db = fx.CreateContext();
        var leader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.leader@example.com");
        Assert.NotNull(leader.AuthUserId);

        var fellowshipClient = ClientForAuthUser(
            leader.AuthUserId!.Value,
            "jane.leader@example.com",
            "Jane Leader");

        var blocked = await fellowshipClient.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });

        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
    }

    [Fact]
    public async Task Pastor_lists_created_programs()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await client.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });

        var list = await client.GetFromJsonAsync<JsonElement>("/api/giving/programs");
        Assert.Equal(1, list.GetProperty("programs").GetArrayLength());
        Assert.Equal("Rhapsody 2026", list.GetProperty("programs")[0].GetProperty("title").GetString());
    }
}
