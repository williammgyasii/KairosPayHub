using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class NestedGivingApiTests(PostgresFixture fx) : IAsyncLifetime
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

    private HttpClient ClientForAuthUser(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    [Fact]
    public async Task Pastor_creates_sub_period_and_logs_contribution_on_child_not_parent()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Nested Church" });

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
            newLeader = new { name = "Jane", email = "jane@example.com" },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new { name = "Bob", email = "bob@example.com" },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane@example.com");

        var rootResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var rootId = (await rootResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var childResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January Rhapsody",
            periodLabel = "January 2026",
            scopeKind = "ChurchWide",
        });
        Assert.Equal(HttpStatusCode.OK, childResp.StatusCode);
        var childId = (await childResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var children = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/children");
        Assert.Equal(1, children.GetProperty("programs").GetArrayLength());

        var cellClient = ClientForAuthUser(cellLeader.AuthUserId!.Value, "bob@example.com", "Bob");

        var blockedOnParent = await cellClient.PostAsJsonAsync($"/api/giving/programs/{rootId}/contributions", new
        {
            memberId,
            amount = 50m,
            dateSent = "2026-01-15T00:00:00Z",
            attachmentKey = "giving/test/a.jpg",
        });
        Assert.Equal(HttpStatusCode.BadRequest, blockedOnParent.StatusCode);

        var onChild = await cellClient.PostAsJsonAsync($"/api/giving/programs/{childId}/contributions", new
        {
            memberId,
            amount = 100m,
            dateSent = "2026-01-15T00:00:00Z",
            attachmentKey = "giving/test/b.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, onChild.StatusCode);

        var fellowshipClient = ClientForAuthUser(fellowshipLeader.AuthUserId!.Value, "jane@example.com", "Jane");
        var contributionId = (await onChild.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var approve = await fellowshipClient.PostAsync(
            $"/api/giving/programs/{childId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var rootRollup = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/rollup");
        Assert.Equal(100m, rootRollup.GetProperty("totalApprovedAmount").GetDecimal());
        Assert.True(rootRollup.GetProperty("includesDescendants").GetBoolean());
    }

    [Fact]
    public async Task Child_scope_wider_than_parent_is_rejected()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Scope Church" });

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

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Titans",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var rootId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Fellowship Rhapsody",
            periodLabel = "2026",
            scopeKind = "Fellowship",
            scopeNodeId = fellowshipId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var blocked = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January",
            periodLabel = "Jan",
            scopeKind = "ChurchWide",
        });
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
    }

    [Fact]
    public async Task Dashboard_aggregates_open_campaigns()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Dash Church" });

        await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });

        var dashboard = await pastor.GetFromJsonAsync<JsonElement>("/api/giving/dashboard");
        Assert.True(dashboard.GetProperty("openCampaignCount").GetInt32() >= 1);
        Assert.True(dashboard.GetProperty("campaigns").GetArrayLength() >= 1);
    }
}
