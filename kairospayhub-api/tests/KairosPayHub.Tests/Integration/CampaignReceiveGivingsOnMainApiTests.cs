using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class CampaignReceiveGivingsOnMainApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "receive-pastor@example.com");
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

    private async Task OnboardAsync(HttpClient pastor)
    {
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Receive Church" });
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });
    }

    [Fact]
    public async Task Create_root_with_receive_on_defaults_and_exposes_flag()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

        var resp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Sunday Services 2026",
            startsOn = "2026-01-01",
            endsOn = "2026-12-31",
            scopeKind = "ChurchWide",
            receiveGivingsOnMain = true,
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("receiveGivingsOnMain").GetBoolean());
        Assert.True(body.GetProperty("acceptsContributions").GetBoolean());
    }

    [Fact]
    public async Task Create_root_with_receive_off_without_first_sub_is_rejected()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

        var resp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Container Only",
            startsOn = "2026-01-01",
            endsOn = "2026-12-31",
            scopeKind = "ChurchWide",
            receiveGivingsOnMain = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Create_root_with_receive_off_and_first_sub_succeeds()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

        var resp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Sunday Services 2026",
            startsOn = "2026-01-01",
            endsOn = "2026-12-31",
            scopeKind = "ChurchWide",
            receiveGivingsOnMain = false,
            firstSubCampaign = new
            {
                title = "Sunday 4 Jan",
                eventDate = "2026-01-04",
                scopeKind = "ChurchWide",
            },
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("receiveGivingsOnMain").GetBoolean());
        Assert.False(body.GetProperty("acceptsContributions").GetBoolean());
        Assert.True(body.GetProperty("hasChildren").GetBoolean());

        var children = await pastor.GetFromJsonAsync<JsonElement>(
            $"/api/giving/programs/{body.GetProperty("id").GetGuid()}/children");
        Assert.Equal(1, children.GetProperty("programs").GetArrayLength());
    }

    [Fact]
    public async Task Contribution_on_root_rejected_when_receive_off()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

        var created = await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Subs Only",
            startsOn = "2026-01-01",
            endsOn = "2026-12-31",
            scopeKind = "ChurchWide",
            receiveGivingsOnMain = false,
            firstSubCampaign = new
            {
                title = "Week 1",
                eventDate = "2026-01-04",
                scopeKind = "ChurchWide",
            },
        })).Content.ReadFromJsonAsync<JsonElement>();

        var rootId = created.GetProperty("id").GetGuid();
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
                email = "jane-receive@example.com",
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
                email = "bob-receive@example.com",
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

        var onRoot = await pastor.PostAsJsonAsync($"/api/giving/programs/{rootId}/contributions", new
        {
            memberId,
            amount = 50m,
            dateSent = "2026-01-15T00:00:00Z",
            attachmentKey = "giving/test/receive-a.jpg",
        });
        Assert.Equal(HttpStatusCode.BadRequest, onRoot.StatusCode);
    }

    [Fact]
    public async Task Settings_turn_off_with_directs_requires_move_to_sub()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);

        var root = await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "With Directs",
            startsOn = "2026-01-01",
            endsOn = "2026-12-31",
            scopeKind = "ChurchWide",
            receiveGivingsOnMain = true,
        })).Content.ReadFromJsonAsync<JsonElement>();
        var rootId = root.GetProperty("id").GetGuid();

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();
        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Alpha",
            newLeader = new
            {
                name = "Ann",
                email = "ann-receive@example.com",
                phone = "+233241234569",
                dateOfBirth = "1992-01-01",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();
        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
            newLeader = new
            {
                name = "Carl",
                email = "carl-receive@example.com",
                phone = "+233241234570",
                dateOfBirth = "1993-01-01",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();
        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Donor",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "carl-receive@example.com");
        var cellClient = ClientForAuthUser(cellLeader.AuthUserId!.Value, "carl-receive@example.com", "Carl");

        var log = await cellClient.PostAsJsonAsync($"/api/giving/programs/{rootId}/contributions", new
        {
            memberId,
            amount = 75m,
            dateSent = "2026-01-15T00:00:00Z",
            attachmentKey = "giving/test/receive-b.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, log.StatusCode);

        var blocked = await pastor.PatchAsJsonAsync($"/api/giving/programs/{rootId}/settings", new
        {
            receiveGivingsOnMain = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);

        var moved = await pastor.PatchAsJsonAsync($"/api/giving/programs/{rootId}/settings", new
        {
            receiveGivingsOnMain = false,
            createSubThenMove = new
            {
                title = "Unallocated",
                eventDate = "2026-01-15",
                scopeKind = "ChurchWide",
            },
        });
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        var updated = await moved.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(updated.GetProperty("receiveGivingsOnMain").GetBoolean());
        Assert.Equal(0, updated.GetProperty("directContributionCount").GetInt32());
        Assert.True(updated.GetProperty("hasChildren").GetBoolean());
    }
}
