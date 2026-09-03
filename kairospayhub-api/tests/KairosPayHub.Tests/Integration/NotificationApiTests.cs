using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class NotificationApiTests(PostgresFixture fx) : IAsyncLifetime
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
    public async Task Pfcc_manager_sub_giving_pending_notifies_pastor_approve_notifies_manager()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Notify Church" });

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
            newLeader = new
            {
                name = "Paul PFCC",
                email = "paul.pfcc@example.com",
                phone = "+233241111111",
                dateOfBirth = "1988-01-01",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.fellowship@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var pfccManager = await db.ChurchMembers.SingleAsync(m => m.Email == "paul.pfcc@example.com");
        Assert.NotNull(pfccManager.AuthUserId);

        var rootId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var pfccClient = ClientForAuthUser(
            pfccManager.AuthUserId!.Value,
            "paul.pfcc@example.com",
            "Paul PFCC");

        var subResp = await pfccClient.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January Rhapsody",
            periodLabel = "January 2026",
            scopeKind = "Fellowship",
            scopeNodeId = fellowshipId,
        });
        Assert.Equal(HttpStatusCode.OK, subResp.StatusCode);
        var subBody = await subResp.Content.ReadFromJsonAsync<JsonElement>();
        var subId = subBody.GetProperty("id").GetGuid();
        Assert.Equal("PendingPastorApproval", subBody.GetProperty("approvalStatus").GetString());
        Assert.Equal("Paul PFCC", subBody.GetProperty("createdByName").GetString());
        Assert.Equal("PFCC 1", subBody.GetProperty("createdByScopeUnitName").GetString());

        var pastorNotifications = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, pastorNotifications.GetProperty("unreadCount").GetInt32());
        var pastorItem = pastorNotifications.GetProperty("notifications")[0];
        Assert.Equal("SubGivingPendingApproval", pastorItem.GetProperty("kind").GetString());
        Assert.Contains("Paul PFCC", pastorItem.GetProperty("body").GetString());
        Assert.Contains("January Rhapsody", pastorItem.GetProperty("body").GetString());
        Assert.Equal($"givings/{rootId}?tab=subgivings", pastorItem.GetProperty("linkPath").GetString());

        var children = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/children");
        var childRow = children.GetProperty("programs")[0];
        Assert.Equal("Paul PFCC", childRow.GetProperty("createdByName").GetString());

        var approve = await pastor.PostAsync($"/api/giving/programs/{subId}/approve", null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var managerNotifications = await pfccClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, managerNotifications.GetProperty("unreadCount").GetInt32());
        var managerItem = managerNotifications.GetProperty("notifications")[0];
        Assert.Equal("SubGivingApproved", managerItem.GetProperty("kind").GetString());
        Assert.Contains("January Rhapsody", managerItem.GetProperty("body").GetString());
    }

    [Fact]
    public async Task Contribution_pending_notifies_fellowship_leader_not_pastor_approve_notifies_enterer()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Contrib Notify Church" });

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
                email = "jane.fellowship@example.com",
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
                name = "Bob Cell",
                email = "bob.cell@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.cell@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship@example.com");

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
            title = "January Rhapsody",
            periodLabel = "January 2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(
            cellLeader.AuthUserId!.Value,
            "bob.cell@example.com",
            "Bob Cell");
        var fellowshipClient = ClientForAuthUser(
            fellowshipLeader.AuthUserId!.Value,
            "jane.fellowship@example.com",
            "Jane Fellowship");

        var create = await cellClient.PostAsJsonAsync($"/api/giving/programs/{childId}/contributions", new
        {
            memberId,
            amount = 100m,
            currency = "GHS",
            dateSent = "2026-08-01T00:00:00Z",
            attachmentKey = "giving/test/receipt.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var contributionId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var pastorNotifications = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.DoesNotContain(
            pastorNotifications.GetProperty("notifications").EnumerateArray(),
            n => n.GetProperty("kind").GetString() == "ContributionPendingApproval");

        var fellowshipNotifications = await fellowshipClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.True(fellowshipNotifications.GetProperty("unreadCount").GetInt32() >= 1);
        Assert.Contains(
            fellowshipNotifications.GetProperty("notifications").EnumerateArray(),
            n => n.GetProperty("kind").GetString() == "ContributionPendingApproval");

        var approve = await fellowshipClient.PostAsync(
            $"/api/giving/programs/{childId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var cellNotifications = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, cellNotifications.GetProperty("unreadCount").GetInt32());
        Assert.Equal(
            "ContributionApproved",
            cellNotifications.GetProperty("notifications")[0].GetProperty("kind").GetString());
    }

    [Fact]
    public async Task Mark_read_and_read_all_update_unread_count()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Read Church" });

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
            newLeader = new
            {
                name = "Paul PFCC",
                email = "paul.read@example.com",
                phone = "+233241111111",
                dateOfBirth = "1988-01-01",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var pfccManager = await db.ChurchMembers.SingleAsync(m => m.Email == "paul.read@example.com");

        var rootId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var pfccClient = ClientForAuthUser(
            pfccManager.AuthUserId!.Value,
            "paul.read@example.com",
            "Paul PFCC");

        await pfccClient.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "February Rhapsody",
            periodLabel = "February 2026",
            scopeKind = "Fellowship",
            scopeNodeId = fellowshipId,
        });
        await pfccClient.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "March Rhapsody",
            periodLabel = "March 2026",
            scopeKind = "Fellowship",
            scopeNodeId = fellowshipId,
        });

        var list = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(2, list.GetProperty("unreadCount").GetInt32());
        var firstId = list.GetProperty("notifications")[0].GetProperty("id").GetGuid();

        var markOne = await pastor.PostAsync($"/api/notifications/{firstId}/read", null);
        Assert.Equal(HttpStatusCode.OK, markOne.StatusCode);
        Assert.Equal(1, (await pastor.GetFromJsonAsync<JsonElement>("/api/notifications/unread-count"))
            .GetProperty("unreadCount").GetInt32());

        var markAll = await pastor.PostAsync("/api/notifications/read-all", null);
        Assert.Equal(HttpStatusCode.OK, markAll.StatusCode);
        Assert.Equal(0, (await pastor.GetFromJsonAsync<JsonElement>("/api/notifications/unread-count"))
            .GetProperty("unreadCount").GetInt32());
    }

    [Fact]
    public async Task Pastor_creates_church_wide_campaign_notifies_scoped_leaders()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Campaign Notify Church" });

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
                email = "jane.campaign@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.campaign@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.campaign@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.campaign@example.com");

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(
            cellLeader.AuthUserId!.Value,
            "bob.campaign@example.com",
            "Bob Cell");
        var fellowshipClient = ClientForAuthUser(
            fellowshipLeader.AuthUserId!.Value,
            "jane.campaign@example.com",
            "Jane Fellowship");

        var pastorNotifications = await pastor.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(0, pastorNotifications.GetProperty("unreadCount").GetInt32());

        var cellNotifications = await cellClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, cellNotifications.GetProperty("unreadCount").GetInt32());
        var cellItem = cellNotifications.GetProperty("notifications")[0];
        Assert.Equal("GivingCampaignOpened", cellItem.GetProperty("kind").GetString());
        Assert.Contains("Rhapsody 2026", cellItem.GetProperty("body").GetString());
        Assert.Equal($"givings/{programId}", cellItem.GetProperty("linkPath").GetString());

        var fellowshipNotifications = await fellowshipClient.GetFromJsonAsync<JsonElement>("/api/notifications");
        Assert.Equal(1, fellowshipNotifications.GetProperty("unreadCount").GetInt32());
        Assert.Equal(
            "GivingCampaignOpened",
            fellowshipNotifications.GetProperty("notifications")[0].GetProperty("kind").GetString());
    }
}
