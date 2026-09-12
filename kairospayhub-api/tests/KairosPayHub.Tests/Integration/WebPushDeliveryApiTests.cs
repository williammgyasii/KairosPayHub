using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class WebPushDeliveryApiTests(PostgresFixture fx) : IAsyncLifetime
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
    public async Task Subscribed_leader_gets_os_push_with_inbox_copy()
    {
        var (cellClient, programId) = await SeedCampaignNotifyAsync(subscribeCellLeader: true);

        Assert.Single(_factory.Push.Sent);
        var send = _factory.Push.Sent[0];
        Assert.Equal("https://push.example/cell-phone", send.Endpoint);

        var inbox = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        var item = inbox.GetProperty("notifications")[0];
        Assert.Equal(item.GetProperty("title").GetString(), send.Title);
        Assert.Equal(item.GetProperty("body").GetString(), send.Body);
        Assert.Equal(item.GetProperty("linkPath").GetString(), send.LinkPath);
        Assert.Equal($"givings/{programId}", send.LinkPath);
    }

    [Fact]
    public async Task No_subscription_still_creates_inbox_and_sends_nothing()
    {
        var (cellClient, _) = await SeedCampaignNotifyAsync(subscribeCellLeader: false);

        Assert.Empty(_factory.Push.Sent);
        var inbox = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, inbox.GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task Gone_endpoint_is_deleted_and_inbox_still_succeeds()
    {
        var (cellClient, _) = await SeedCampaignNotifyAsync(
            subscribeCellLeader: true,
            goneEndpoint: "https://push.example/cell-phone");

        var listed = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications/push/subscriptions");
        Assert.Empty(listed.GetProperty("subscriptions").EnumerateArray());

        var inbox = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, inbox.GetProperty("unreadCount").GetInt32());
    }

    private async Task<(HttpClient CellClient, Guid ProgramId)> SeedCampaignNotifyAsync(
        bool subscribeCellLeader,
        string? goneEndpoint = null)
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Push Deliver Church" });

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
                name = "Jane Fellowship",
                email = "jane.push@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.push@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.push@example.com");
        var cellClient = ClientForAuthUser(cellLeader.AuthUserId!.Value, "bob.push@example.com", "Bob Cell");

        if (subscribeCellLeader)
        {
            var put = await cellClient.PutAsJsonAsync("/api/notifications/push/subscriptions", new
            {
                endpoint = "https://push.example/cell-phone",
                p256dh = "p256dh-cell",
                auth = "auth-cell",
            });
            Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        }

        if (goneEndpoint is not null)
            _factory.Push.SetStatus(goneEndpoint, 410);

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        return (cellClient, programId);
    }
}
