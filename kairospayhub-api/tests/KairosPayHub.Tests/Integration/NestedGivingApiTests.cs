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
            newLeader = new
            {
                name = "Jane",
                email = "jane@example.com",
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
                email = "bob@example.com",
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

        children = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/children");
        Assert.Equal(100m, children.GetProperty("programs")[0].GetProperty("totalApprovedAmount").GetDecimal());
    }

    [Fact]
    public async Task Fellowship_leader_logs_with_attachment_auto_approves_and_shows_on_children_list()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Auto Approve Church" });

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
                email = "jane.auto@example.com",
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
                email = "bob.auto@example.com",
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
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.auto@example.com");

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

        var fellowshipClient = ClientForAuthUser(
            fellowshipLeader.AuthUserId!.Value,
            "jane.auto@example.com",
            "Jane");

        var create = await fellowshipClient.PostAsJsonAsync($"/api/giving/programs/{childId}/contributions", new
        {
            memberId,
            amount = 250m,
            dateSent = "2026-01-20T00:00:00Z",
            attachmentKey = "giving/test/fl-receipt.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var body = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PendingApproval", body.GetProperty("status").GetString());
        Assert.Equal("FellowshipLeader", body.GetProperty("enteredByRole").GetString());
        Assert.Equal("Pastor", body.GetProperty("pendingApproverRole").GetString());

        var approve = await pastor.PostAsync(
            $"/api/giving/programs/{childId}/contributions/{body.GetProperty("id").GetGuid()}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var children = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/children");
        Assert.Equal(250m, children.GetProperty("programs")[0].GetProperty("totalApprovedAmount").GetDecimal());
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
    public async Task Creating_sub_giving_with_moveParentContributions_reassigns_parent_contributions()
    {
        var (pastor, rootId, memberId, fellowshipClient, cellClient) = await SeedNestedGivingAsync();

        var onParent = await cellClient.PostAsJsonAsync($"/api/giving/programs/{rootId}/contributions", new
        {
            memberId,
            amount = 50m,
            dateSent = "2026-01-10T00:00:00Z",
            attachmentKey = "giving/test/parent-a.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, onParent.StatusCode);
        var parentContributionId = (await onParent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var approveParent = await fellowshipClient.PostAsync(
            $"/api/giving/programs/{rootId}/contributions/{parentContributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approveParent.StatusCode);

        var childResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January 2026",
            periodLabel = "January 2026",
            scopeKind = "ChurchWide",
            moveParentContributions = true,
        });
        Assert.Equal(HttpStatusCode.OK, childResp.StatusCode);
        var childId = (await childResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var parentList = await pastor.GetFromJsonAsync<JsonElement>(
            $"/api/giving/programs/{rootId}/contributions?page=1&pageSize=20");
        Assert.Equal(1, parentList.GetProperty("totalCount").GetInt32());
        Assert.Equal(childId.ToString(), parentList.GetProperty("contributions")[0].GetProperty("programId").GetString());

        var rootProgram = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}");
        Assert.Equal(0, rootProgram.GetProperty("directContributionCount").GetInt32());
    }

    [Fact]
    public async Task Rollup_excludes_direct_parent_contributions_when_sub_givings_exist()
    {
        var (pastor, rootId, memberId, fellowshipClient, cellClient) = await SeedNestedGivingAsync();

        var onParent = await cellClient.PostAsJsonAsync($"/api/giving/programs/{rootId}/contributions", new
        {
            memberId,
            amount = 50m,
            dateSent = "2026-01-10T00:00:00Z",
            attachmentKey = "giving/test/parent-legacy.jpg",
        });
        var parentContributionId = (await onParent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await fellowshipClient.PostAsync(
            $"/api/giving/programs/{rootId}/contributions/{parentContributionId}/approve",
            null);

        var childResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January 2026",
            periodLabel = "January 2026",
            scopeKind = "ChurchWide",
        });
        var childId = (await childResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var onChild = await cellClient.PostAsJsonAsync($"/api/giving/programs/{childId}/contributions", new
        {
            memberId,
            amount = 100m,
            dateSent = "2026-01-15T00:00:00Z",
            attachmentKey = "giving/test/child.jpg",
        });
        var childContributionId = (await onChild.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await fellowshipClient.PostAsync(
            $"/api/giving/programs/{childId}/contributions/{childContributionId}/approve",
            null);

        var rootRollup = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}/rollup");
        Assert.Equal(100m, rootRollup.GetProperty("totalApprovedAmount").GetDecimal());

        var rootProgram = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}");
        Assert.Equal(100m, rootProgram.GetProperty("totalApprovedAmount").GetDecimal());
    }

    [Fact]
    public async Task Direct_parent_contributions_are_flagged_as_legacy_when_sub_givings_exist()
    {
        var (pastor, rootId, memberId, fellowshipClient, cellClient) = await SeedNestedGivingAsync();

        var onParent = await cellClient.PostAsJsonAsync($"/api/giving/programs/{rootId}/contributions", new
        {
            memberId,
            amount = 75m,
            dateSent = "2026-01-10T00:00:00Z",
            attachmentKey = "giving/test/legacy.jpg",
        });
        var parentContributionId = (await onParent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await fellowshipClient.PostAsync(
            $"/api/giving/programs/{rootId}/contributions/{parentContributionId}/approve",
            null);

        var rootBeforeChild = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{rootId}");
        Assert.Equal(1, rootBeforeChild.GetProperty("directContributionCount").GetInt32());
        Assert.Equal(75m, rootBeforeChild.GetProperty("directContributionTotalAmount").GetDecimal());

        await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            parentProgramId = rootId,
            title = "January 2026",
            periodLabel = "January 2026",
            scopeKind = "ChurchWide",
        });

        var parentList = await pastor.GetFromJsonAsync<JsonElement>(
            $"/api/giving/programs/{rootId}/contributions?page=1&pageSize=20");
        var row = parentList.GetProperty("contributions")[0];
        Assert.True(row.GetProperty("isLegacyParentContribution").GetBoolean());
        Assert.False(row.GetProperty("isSubGiving").GetBoolean());
    }

    private async Task<(
        HttpClient Pastor,
        Guid RootId,
        Guid MemberId,
        HttpClient FellowshipClient,
        HttpClient CellClient)> SeedNestedGivingAsync()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Legacy Parent Church" });

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
                email = "jane.legacy@example.com",
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
                email = "bob.legacy@example.com",
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
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.legacy@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.legacy@example.com");

        var rootResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var rootId = (await rootResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        return (
            pastor,
            rootId,
            memberId,
            ClientForAuthUser(fellowshipLeader.AuthUserId!.Value, "jane.legacy@example.com", "Jane"),
            ClientForAuthUser(cellLeader.AuthUserId!.Value, "bob.legacy@example.com", "Bob"));
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
