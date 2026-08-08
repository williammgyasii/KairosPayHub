using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureMembersListApiTests(PostgresFixture fx) : IAsyncLifetime
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
    public async Task ListMembers_paginates_by_page_and_pageSize()
    {
        var client = PastorClient();
        var cellId = await SeedFlatCellAsync(client, memberCount: 12);

        var page1 = await client.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?page=1&pageSize=5");
        Assert.Equal(12, page1.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, page1.GetProperty("page").GetInt32());
        Assert.Equal(5, page1.GetProperty("pageSize").GetInt32());
        Assert.Equal(5, page1.GetProperty("items").GetArrayLength());

        var page3 = await client.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?page=3&pageSize=5");
        Assert.Equal(2, page3.GetProperty("items").GetArrayLength());
        Assert.Equal(3, page3.GetProperty("page").GetInt32());

        _ = cellId;
    }

    [Fact]
    public async Task ListMembers_sorts_by_name_asc_and_desc()
    {
        var client = PastorClient();
        var cellId = await SeedFlatCellAsync(client, memberCount: 0);

        foreach (var name in new[] { "Zara Ok", "Alice Bee", "Mike Chen" })
        {
            var created = await client.PostAsJsonAsync("/api/structure/members", new
            {
                name,
                parentNodeId = cellId,
            });
            Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        }

        var asc = await client.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?sortBy=name&sortDir=asc&pageSize=10");
        var ascNames = asc.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("name").GetString())
            .ToList();
        Assert.Equal(["Alice Bee", "Mike Chen", "Zara Ok"], ascNames);

        var desc = await client.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?sortBy=name&sortDir=desc&pageSize=10");
        var descNames = desc.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("name").GetString())
            .ToList();
        Assert.Equal(["Zara Ok", "Mike Chen", "Alice Bee"], descNames);
    }

    [Fact]
    public async Task ListMembers_search_filters_by_name_email_or_phone()
    {
        var client = PastorClient();
        var cellId = await SeedFlatCellAsync(client, memberCount: 0);

        await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Joann Mensah",
            parentNodeId = cellId,
            email = "joann@example.com",
            phone = "+233241111111",
        });
        await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kwame Boateng",
            parentNodeId = cellId,
            email = "kwame@example.com",
            phone = "+233242222222",
        });

        var byName = await client.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?search=joann&pageSize=10");
        Assert.Equal(1, byName.GetProperty("totalCount").GetInt32());
        Assert.Equal("Joann Mensah", byName.GetProperty("items")[0].GetProperty("name").GetString());

        var byEmail = await client.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?search=kwame@example.com&pageSize=10");
        Assert.Equal(1, byEmail.GetProperty("totalCount").GetInt32());
        Assert.Equal("Kwame Boateng", byEmail.GetProperty("items")[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task ListMembers_scopes_to_parentNode_and_descendants()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var template = await PutFlatTemplateAsync(client);
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipA = await CreateNodeAsync(client, fellowshipLayerId, null, "Fellowship A");
        var fellowshipB = await CreateNodeAsync(client, fellowshipLayerId, null, "Fellowship B");
        var cellA = await CreateNodeAsync(client, cellLayerId, fellowshipA, "Cell A");
        var cellB = await CreateNodeAsync(client, cellLayerId, fellowshipB, "Cell B");

        await CreateMemberAsync(client, cellA, "Member A1");
        await CreateMemberAsync(client, cellA, "Member A2");
        await CreateMemberAsync(client, cellB, "Member B1");

        var scoped = await client.GetFromJsonAsync<JsonElement>(
            $"/api/structure/members?parentNodeId={fellowshipA}&includeDescendants=true&pageSize=10");
        Assert.Equal(2, scoped.GetProperty("totalCount").GetInt32());
        var scopedNames = scoped.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("name").GetString())
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();
        Assert.Equal(["Member A1", "Member A2"], scopedNames);
    }

    private static async Task OnboardAsync(HttpClient client, string churchName = "List Church")
    {
        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { churchName });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);
    }

    private static async Task<JsonElement> PutFlatTemplateAsync(HttpClient client)
    {
        var response = await client.PutAsJsonAsync("/api/structure/template", new
        {
            name = "Flat",
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>())!;
    }

    private static async Task<Guid> SeedFlatCellAsync(HttpClient client, int memberCount)
    {
        await OnboardAsync(client);
        var template = await PutFlatTemplateAsync(client);
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipId = await CreateNodeAsync(client, fellowshipLayerId, null, "Fellowship One");
        var cellId = await CreateNodeAsync(client, cellLayerId, fellowshipId, "Cell One");

        for (var i = 1; i <= memberCount; i++)
        {
            await CreateMemberAsync(client, cellId, $"Member {i:D2}");
        }

        return cellId;
    }

    private static async Task<Guid> CreateNodeAsync(
        HttpClient client,
        Guid layerId,
        Guid? parentNodeId,
        string name)
    {
        var response = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId,
            name,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node")
            .GetProperty("id")
            .GetGuid();
    }

    private static async Task CreateMemberAsync(HttpClient client, Guid cellId, string name)
    {
        var response = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name,
            parentNodeId = cellId,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
