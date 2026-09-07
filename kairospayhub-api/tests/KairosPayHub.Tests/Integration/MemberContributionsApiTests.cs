using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class MemberContributionsApiTests(PostgresFixture fx) : IAsyncLifetime
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
    public async Task Member_contributions_filter_by_status_and_sort_by_amount()
    {
        var seed = await SeedMemberWithTwoContributionsAsync();

        var approvedOnly = await seed.Pastor.GetFromJsonAsync<JsonElement>(
            $"/api/giving/members/{seed.MemberId}/contributions?status=Approved&sortBy=amount&sortDir=asc");
        Assert.Equal(1, approvedOnly.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, approvedOnly.GetProperty("contributions").GetArrayLength());
        Assert.Equal("Approved", approvedOnly.GetProperty("contributions")[0].GetProperty("status").GetString());
        Assert.Equal(50m, approvedOnly.GetProperty("contributions")[0].GetProperty("amount").GetDecimal());

        var byAmountAsc = await seed.Pastor.GetFromJsonAsync<JsonElement>(
            $"/api/giving/members/{seed.MemberId}/contributions?sortBy=amount&sortDir=asc&pageSize=10");
        Assert.Equal(2, byAmountAsc.GetProperty("totalCount").GetInt32());
        var amounts = byAmountAsc.GetProperty("contributions").EnumerateArray()
            .Select(c => c.GetProperty("amount").GetDecimal())
            .ToList();
        Assert.Equal([50m, 100m], amounts);

        var page1 = await seed.Pastor.GetFromJsonAsync<JsonElement>(
            $"/api/giving/members/{seed.MemberId}/contributions?page=1&pageSize=1&sortBy=amount&sortDir=desc");
        Assert.Equal(2, page1.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, page1.GetProperty("page").GetInt32());
        Assert.Equal(1, page1.GetProperty("pageSize").GetInt32());
        Assert.Equal(1, page1.GetProperty("contributions").GetArrayLength());
        Assert.Equal(100m, page1.GetProperty("contributions")[0].GetProperty("amount").GetDecimal());
    }

    private async Task<(HttpClient Pastor, Guid MemberId)> SeedMemberWithTwoContributionsAsync()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Member Giving Church" });
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
            parentNodeId = (Guid?)null,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.membergiving@example.com",
                phone = "+233241234567",
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
                email = "bob.membergiving@example.com",
                phone = "+233241234568",
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
            email = "kay.membergiving@example.com",
        });
        var memberId = (await memberResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.membergiving@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.membergiving@example.com");
        Assert.NotNull(cellLeader.AuthUserId);
        Assert.NotNull(fellowshipLeader.AuthUserId);

        var programResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var programId = (await programResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(
            cellLeader.AuthUserId!.Value,
            "bob.membergiving@example.com",
            "Bob Cell");
        var fellowshipClient = ClientForAuthUser(
            fellowshipLeader.AuthUserId!.Value,
            "jane.membergiving@example.com",
            "Jane Fellowship");

        async Task<Guid> LogAsync(decimal amount, string date)
        {
            var create = await cellClient.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
            {
                memberId,
                amount,
                currency = "GHS",
                dateSent = date,
                attachmentKey = "giving/test/receipt.jpg",
            });
            Assert.Equal(HttpStatusCode.OK, create.StatusCode);
            return (await create.Content.ReadFromJsonAsync<JsonElement>())!.GetProperty("id").GetGuid();
        }

        var pendingId = await LogAsync(100m, "2026-08-01T00:00:00Z");
        var approvedId = await LogAsync(50m, "2026-08-02T00:00:00Z");

        var approve = await fellowshipClient.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{approvedId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        _ = pendingId;
        return (pastor, memberId);
    }
}
