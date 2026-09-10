using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class GivingStructureScopeApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "scope-pastor@example.com");
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

    private async Task<(Guid FellowshipLayerId, Guid CellLayerId, Guid FellowshipA, Guid FellowshipB, Guid CellA)> SeedFellowshipCellAsync(
        HttpClient pastor)
    {
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Scope Church" });
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

        var fellowshipA = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Fellowship A",
            newLeader = new
            {
                name = "Alice FL",
                email = "alice-fl@example.com",
                phone = "+233241111111",
                dateOfBirth = "1990-01-01",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipB = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Fellowship B",
            newLeader = new
            {
                name = "Ben FL",
                email = "ben-fl@example.com",
                phone = "+233241111112",
                dateOfBirth = "1991-01-01",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellA = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipA,
            name = "Cell A",
            newLeader = new
            {
                name = "Celeste CL",
                email = "celeste-cl@example.com",
                phone = "+233241111113",
                dateOfBirth = "1992-01-01",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        return (fellowshipLayerId, cellLayerId, fellowshipA, fellowshipB, cellA);
    }

    [Fact]
    public async Task Creates_campaign_scoped_to_fellowship_without_scope_kind_on_no_pfcc_church()
    {
        var pastor = PastorClient();
        var (_, _, fellowshipA, _, _) = await SeedFellowshipCellAsync(pastor);

        var create = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Fellowship Sunday",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeId = fellowshipA,
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var body = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(fellowshipA, body.GetProperty("scopeNodeId").GetGuid());
        Assert.Equal("Fellowship", body.GetProperty("scopeKind").GetString());
    }

    [Fact]
    public async Task Rejects_multi_select_units_on_different_layers()
    {
        var pastor = PastorClient();
        var (_, _, fellowshipA, _, cellA) = await SeedFellowshipCellAsync(pastor);

        var create = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SpecialProgram",
            title = "Cross layer",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeIds = new[] { fellowshipA, cellA },
        });
        Assert.Equal(HttpStatusCode.BadRequest, create.StatusCode);
    }

    [Fact]
    public async Task Rejects_sub_campaign_outside_parent_subtree()
    {
        var pastor = PastorClient();
        var (_, _, fellowshipA, fellowshipB, _) = await SeedFellowshipCellAsync(pastor);

        var parentId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Parent A",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeId = fellowshipA,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var child = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Outside",
            parentProgramId = parentId,
            eventDate = "2026-03-08",
            scopeNodeId = fellowshipB,
        });
        Assert.Equal(HttpStatusCode.BadRequest, child.StatusCode);
    }

    [Fact]
    public async Task Allows_cell_sub_campaign_under_same_fellowship_parent()
    {
        var pastor = PastorClient();
        var (_, _, fellowshipA, _, cellA) = await SeedFellowshipCellAsync(pastor);

        var parentId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Parent A",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeId = fellowshipA,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var child = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Cell Sunday",
            parentProgramId = parentId,
            eventDate = "2026-03-08",
            scopeNodeId = cellA,
        });
        Assert.Equal(HttpStatusCode.OK, child.StatusCode);
        var body = await child.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(cellA, body.GetProperty("scopeNodeId").GetGuid());
        Assert.Equal("Unit", body.GetProperty("scopeKind").GetString());
    }

    [Fact]
    public async Task Intermediate_leader_can_create_sub_campaign_in_scope()
    {
        var pastor = PastorClient();
        var (_, _, fellowshipA, _, cellA) = await SeedFellowshipCellAsync(pastor);

        await using var db = fx.CreateContext();
        var fl = await db.ChurchMembers.SingleAsync(m => m.Email == "alice-fl@example.com");
        Assert.NotNull(fl.AuthUserId);

        var parentId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Parent A",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeId = fellowshipA,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var flClient = ClientForAuthUser(fl.AuthUserId!.Value, "alice-fl@example.com", "Alice FL");
        var child = await flClient.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "FL Sunday",
            parentProgramId = parentId,
            eventDate = "2026-03-15",
            scopeNodeId = cellA,
        });
        Assert.Equal(HttpStatusCode.OK, child.StatusCode);
    }

    [Fact]
    public async Task Leaf_leader_cannot_create_campaign_or_sub_campaign()
    {
        var pastor = PastorClient();
        var (_, _, fellowshipA, _, cellA) = await SeedFellowshipCellAsync(pastor);

        await using var db = fx.CreateContext();
        var cl = await db.ChurchMembers.SingleAsync(m => m.Email == "celeste-cl@example.com");
        Assert.NotNull(cl.AuthUserId);
        var clClient = ClientForAuthUser(cl.AuthUserId!.Value, "celeste-cl@example.com", "Celeste CL");

        var main = await clClient.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Cell Campaign",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeId = cellA,
        });
        Assert.Equal(HttpStatusCode.Forbidden, main.StatusCode);

        var parentId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Parent A",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeNodeId = fellowshipA,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var sub = await clClient.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Cell Sub",
            parentProgramId = parentId,
            eventDate = "2026-03-22",
            scopeNodeId = cellA,
        });
        Assert.Equal(HttpStatusCode.Forbidden, sub.StatusCode);
    }

    [Fact]
    public async Task Approval_after_cell_leader_log_skips_pfcc_when_church_has_none()
    {
        var pastor = PastorClient();
        var (_, _, _, _, cellA) = await SeedFellowshipCellAsync(pastor);

        await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay Member",
            parentNodeId = cellA,
        });

        await using var db = fx.CreateContext();
        var member = await db.ChurchMembers.SingleAsync(m => m.Name == "Kay Member");
        var cl = await db.ChurchMembers.SingleAsync(m => m.Email == "celeste-cl@example.com");
        Assert.NotNull(cl.AuthUserId);

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Approve Hop",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var clClient = ClientForAuthUser(cl.AuthUserId!.Value, "celeste-cl@example.com", "Celeste CL");
        var logged = await clClient.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
        {
            memberId = member.Id,
            amount = 25,
            dateSent = "2026-03-02T00:00:00Z",
            attachmentKey = "giving/test/scope-receipt.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, logged.StatusCode);
        var contribution = await logged.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PendingApproval", contribution.GetProperty("status").GetString());
        Assert.Equal("FellowshipLeader", contribution.GetProperty("pendingApproverRole").GetString());
    }

    [Fact]
    public async Task Approval_after_cell_leader_log_goes_to_pastor_when_no_fellowship_layer()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Church Cell Only" });
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var cellLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();

        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            name = "Cell One",
            newLeader = new
            {
                name = "Dana CL",
                email = "dana-cl@example.com",
                phone = "+233241111120",
                dateOfBirth = "1992-01-01",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cl = await db.ChurchMembers.SingleAsync(m => m.Email == "dana-cl@example.com");
        Assert.NotNull(cl.AuthUserId);

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "SundayService",
            title = "Church Wide Sunday",
            startsOn = "2026-03-01",
            endsOn = "2026-03-31",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var clClient = ClientForAuthUser(cl.AuthUserId!.Value, "dana-cl@example.com", "Dana CL");
        var logged = await clClient.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
        {
            memberId,
            amount = 40,
            dateSent = "2026-03-02T00:00:00Z",
            attachmentKey = "giving/test/scope-receipt.jpg",
        });
        Assert.Equal(HttpStatusCode.OK, logged.StatusCode);
        var contribution = await logged.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PendingApproval", contribution.GetProperty("status").GetString());
        Assert.Equal("Pastor", contribution.GetProperty("pendingApproverRole").GetString());

        var contributionId = contribution.GetProperty("id").GetGuid();
        var approved = await pastor.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        var body = await approved.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Approved", body.GetProperty("status").GetString());
    }
}
