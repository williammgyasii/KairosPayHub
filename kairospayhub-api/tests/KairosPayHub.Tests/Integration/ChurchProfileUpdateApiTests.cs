using System.Net;
using System.Net.Http.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ChurchProfileUpdateApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient AuthedClient(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    private async Task<(Guid ChurchId, HttpClient Pastor, HttpClient CellLeader)> SeedAsync()
    {
        var pastorAuthId = Guid.NewGuid();
        var leaderAuthId = Guid.NewGuid();
        Guid churchId;

        await using (var db = fx.CreateContext())
        {
            var church = StructureSeed.Church("Original Name");
            var template = StructureSeed.Template(church, (StructureLayerType.Cell, "Cell"));
            var cellLayer = template.Layers.Single();
            var cell = StructureSeed.Node(church, cellLayer, "Cell 1");
            var leader = StructureSeed.Member(church, cell, "Cell Leader", "cell.leader@example.com");
            leader.AuthUserId = leaderAuthId;

            db.StructureChurches.Add(church);
            db.StructureTemplates.Add(template);
            db.StructureNodes.Add(cell);
            db.ChurchMembers.Add(leader);
            db.RoleAssignments.Add(StructureSeed.PastorRole(church, pastorAuthId));
            db.RoleAssignments.Add(StructureSeed.CellLeaderRole(church, leaderAuthId, cell));
            await db.SaveChangesAsync();
            churchId = church.Id;
        }

        return (
            churchId,
            AuthedClient(pastorAuthId, "pastor@example.com", "Pastor"),
            AuthedClient(leaderAuthId, "cell.leader@example.com", "Cell Leader"));
    }

    [Fact]
    public async Task Pastor_can_rename_church()
    {
        var (churchId, pastor, _) = await SeedAsync();

        var res = await pastor.PatchAsJsonAsync("/api/church", new { name = "  New Church Name  " });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        await using var db = fx.CreateContext();
        var church = await db.StructureChurches.SingleAsync(c => c.Id == churchId);
        Assert.Equal("New Church Name", church.Name);
    }

    [Fact]
    public async Task Cell_leader_cannot_rename_church()
    {
        var (_, _, leader) = await SeedAsync();

        var res = await leader.PatchAsJsonAsync("/api/church", new { name = "Hacked" });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Empty_name_is_rejected()
    {
        var (_, pastor, _) = await SeedAsync();

        var res = await pastor.PatchAsJsonAsync("/api/church", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
