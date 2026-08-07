using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient()
    {
        var sub = Guid.NewGuid().ToString();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);
        client.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        return client;
    }

    [Fact]
    public async Task Onboarding_creates_church_tenant_and_pastor_role()
    {
        var client = PastorClient();
        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { churchName = "Grace Assembly" });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);

        var body = await onboard.Content.ReadFromJsonAsync<JsonElement>();
        var churchId = body.GetProperty("churchId").GetGuid();

        await using var db = fx.CreateContext();
        Assert.Equal(1, await db.StructureChurches.CountAsync());
        Assert.Equal(1, await db.RoleAssignments.CountAsync(r => r.ChurchId == churchId));
        Assert.Equal("Pastor", (await db.RoleAssignments.SingleAsync()).Role.ToString());
    }

    [Fact]
    public async Task Pastor_can_build_hierarchy_via_structure_api()
    {
        var client = PastorClient();
        await client.PostAsJsonAsync("/api/onboarding", new { churchName = "City Church" });

        var pfcc = await client.PostAsJsonAsync("/api/structure/pfccs", new { name = "PFCC One" });
        var pfccId = (await pfcc.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var fellowship = await client.PostAsJsonAsync("/api/structure/fellowships", new
        {
            name = "Wally Fellowship",
            pfccId,
        });
        var fellowshipId = (await fellowship.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var cell = await client.PostAsJsonAsync("/api/structure/cells", new
        {
            name = "Josh Cell",
            fellowshipId,
        });
        var cellId = (await cell.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var member = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay",
            cellId,
            email = "kay@example.com",
        });
        Assert.Equal(HttpStatusCode.OK, member.StatusCode);

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal("City Church", tree.GetProperty("churchName").GetString());
        Assert.Equal(1, tree.GetProperty("pfccs").GetArrayLength());
        Assert.Equal(1, tree.GetProperty("fellowships").GetArrayLength());
        Assert.Equal(1, tree.GetProperty("cells").GetArrayLength());
        Assert.Equal(1, tree.GetProperty("members").GetArrayLength());
        Assert.Equal("Kay", tree.GetProperty("members")[0].GetProperty("name").GetString());
    }
}
