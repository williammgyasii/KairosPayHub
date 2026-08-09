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
    public async Task Fellowship_leader_cannot_create_sub_giving()
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
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.sub@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var rootId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var leader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.sub@example.com");
        Assert.NotNull(leader.AuthUserId);

        var fellowshipClient = ClientForAuthUser(
            leader.AuthUserId!.Value,
            "jane.sub@example.com",
            "Jane Leader");

        var blocked = await fellowshipClient.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January Rhapsody",
            periodLabel = "January 2026",
            scopeKind = "Fellowship",
            scopeNodeId = fellowshipId,
        });

        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
    }

    [Fact]
    public async Task Fellowship_leader_cannot_create_fellowship_scoped_program()
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
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.fellowship-scoped@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var leader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship-scoped@example.com");
        Assert.NotNull(leader.AuthUserId);

        var fellowshipClient = ClientForAuthUser(
            leader.AuthUserId!.Value,
            "jane.fellowship-scoped@example.com",
            "Jane Leader");

        var blocked = await fellowshipClient.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Titans Rhapsody",
            periodLabel = "2026",
            scopeKind = "Fellowship",
            scopeNodeId = fellowshipId,
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

    [Fact]
    public async Task Pastor_closes_and_reopens_root_campaign()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var created = await client.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var programId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var close = await client.PostAsync($"/api/giving/programs/{programId}/close", null);
        Assert.Equal(HttpStatusCode.OK, close.StatusCode);
        Assert.Equal("Closed", (await close.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());

        var reopen = await client.PostAsync($"/api/giving/programs/{programId}/reopen", null);
        Assert.Equal(HttpStatusCode.OK, reopen.StatusCode);
        Assert.Equal("Open", (await reopen.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Pastor_deletes_empty_campaign_without_contributions()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var created = await client.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Sunday service 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var programId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var delete = await client.DeleteAsync($"/api/giving/programs/{programId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var get = await client.GetAsync($"/api/giving/programs/{programId}");
        Assert.Equal(HttpStatusCode.Forbidden, get.StatusCode);
    }

    [Fact]
    public async Task Pastor_cannot_delete_campaign_with_contributions()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

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

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane",
                email = "jane.delete@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob",
                email = "bob.delete@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.delete@example.com");

        var rootId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var childId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January 2026",
            periodLabel = "January 2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(cellLeader.AuthUserId!.Value, "bob.delete@example.com", "Bob");
        await cellClient.PostAsJsonAsync($"/api/giving/programs/{childId}/contributions", new
        {
            memberId,
            amount = 25m,
            dateSent = "2026-01-15T00:00:00Z",
            attachmentKey = "giving/test/delete.jpg",
        });

        var blocked = await pastor.DeleteAsync($"/api/giving/programs/{rootId}");
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
    }
}
