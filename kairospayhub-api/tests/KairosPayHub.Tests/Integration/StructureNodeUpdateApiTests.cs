using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureNodeUpdateApiTests(PostgresFixture fx) : IAsyncLifetime
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

    private async Task<(Guid CellA, Guid CellB, HttpClient LeaderClient, HttpClient PastorClient)> SeedTwoCellsAsync()
    {
        var leaderAuthId = Guid.NewGuid();
        var pastorAuthId = Guid.NewGuid();
        Guid cellAId;
        Guid cellBId;

        await using (var db = fx.CreateContext())
        {
            var church = StructureSeed.Church("Rename Church");
            var template = StructureSeed.Template(church, (StructureLayerType.Cell, "Cell"));
            var cellLayer = template.Layers.Single();
            var cellA = StructureSeed.Node(church, cellLayer, "Cell A");
            cellA.UnitNumber = "1";
            var cellB = StructureSeed.Node(church, cellLayer, "Cell B");
            var leader = StructureSeed.Member(church, cellA, "Cell Leader", "cell.leader@example.com");
            leader.AuthUserId = leaderAuthId;

            db.StructureChurches.Add(church);
            db.StructureTemplates.Add(template);
            db.StructureNodes.AddRange(cellA, cellB);
            db.ChurchMembers.Add(leader);
            db.RoleAssignments.Add(StructureSeed.CellLeaderRole(church, leaderAuthId, cellA));
            db.RoleAssignments.Add(StructureSeed.PastorRole(church, pastorAuthId));
            await db.SaveChangesAsync();
            cellAId = cellA.Id;
            cellBId = cellB.Id;
        }

        return (
            cellAId,
            cellBId,
            AuthedClient(leaderAuthId, "cell.leader@example.com", "Cell Leader"),
            AuthedClient(pastorAuthId, "pastor@example.com", "Pastor"));
    }

    [Fact]
    public async Task Cell_leader_can_rename_own_cell()
    {
        var (cellA, _, leader, _) = await SeedTwoCellsAsync();

        var patch = await leader.PatchAsJsonAsync($"/api/structure/nodes/{cellA}", new { name = "Cell Alpha" });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        await using var db = fx.CreateContext();
        var node = await db.StructureNodes.SingleAsync(n => n.Id == cellA);
        Assert.Equal("Cell Alpha", node.Name);
        Assert.Equal("1", node.UnitNumber);
    }

    [Fact]
    public async Task Cell_leader_cannot_rename_other_cell()
    {
        var (_, cellB, leader, _) = await SeedTwoCellsAsync();

        var patch = await leader.PatchAsJsonAsync($"/api/structure/nodes/{cellB}", new { name = "Hijacked" });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
    }

    [Fact]
    public async Task Cell_leader_cannot_clear_leader_via_update()
    {
        var (cellA, _, leader, _) = await SeedTwoCellsAsync();

        var patch = await leader.PatchAsJsonAsync($"/api/structure/nodes/{cellA}", new
        {
            name = "Cell A",
            clearLeader = true,
        });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
    }
}
