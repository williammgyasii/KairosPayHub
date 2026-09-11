using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureMemberManageApiTests(PostgresFixture fx) : IAsyncLifetime
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

    [Fact]
    public async Task Cell_leader_cannot_type_add_and_cannot_write_another_cell()
    {
        var authUserId = Guid.NewGuid();
        Guid ownCellId;
        Guid otherCellId;
        await using (var db = fx.CreateContext())
        {
            var church = StructureSeed.Church("Roster Scope Church");
            var template = StructureSeed.Template(church, (StructureLayerType.Cell, "Cell"));
            var cellLayer = template.Layers.Single();
            var ownCell = StructureSeed.Node(church, cellLayer, "Zion Cell 1");
            var otherCell = StructureSeed.Node(church, cellLayer, "Zion Cell 2");
            db.StructureChurches.Add(church);
            db.StructureTemplates.Add(template);
            db.StructureNodes.AddRange(ownCell, otherCell);
            db.RoleAssignments.Add(StructureSeed.CellLeaderRole(church, authUserId, ownCell));
            await db.SaveChangesAsync();
            ownCellId = ownCell.Id;
            otherCellId = otherCell.Id;
        }

        var client = AuthedClient(authUserId, "cell.lead@example.com", "Cell Lead");

        var inScope = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "New Cell Member",
            parentNodeId = ownCellId,
            dateOfBirth = "2000-01-01",
        });
        Assert.Equal(HttpStatusCode.BadRequest, inScope.StatusCode);
        Assert.Contains("join link", await inScope.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        var outOfScope = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Other Cell Member",
            parentNodeId = otherCellId,
            dateOfBirth = "2000-01-01",
        });
        Assert.Equal(HttpStatusCode.Forbidden, outOfScope.StatusCode);
    }
}
