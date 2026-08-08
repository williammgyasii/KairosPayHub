using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureSchemaTests(PostgresFixture fx) : IAsyncLifetime
{
    public Task InitializeAsync() => fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Can_persist_template_node_hierarchy_and_member()
    {
        var church = StructureSeed.Church();
        var template = StructureSeed.Template(
            church,
            (StructureLayerType.PFCC, "PFCC"),
            (StructureLayerType.Fellowship, "Fellowship"),
            (StructureLayerType.Cell, "Cell"));
        var pfccLayer = template.Layers.Single(l => l.StandardType == StructureLayerType.PFCC);
        var fellowshipLayer = template.Layers.Single(l => l.StandardType == StructureLayerType.Fellowship);
        var cellLayer = template.Layers.Single(l => l.StandardType == StructureLayerType.Cell);

        var pfcc = StructureSeed.Node(church, pfccLayer, "PFCC One");
        var fellowship = StructureSeed.Node(church, fellowshipLayer, "Fellowship A", pfcc);
        var cell = StructureSeed.Node(church, cellLayer, "Cell 1", fellowship);
        var member = StructureSeed.Member(church, cell, "Kay", "kay@example.com");

        await using (var db = fx.CreateContext())
        {
            db.AddRange(church, template, pfcc, fellowship, cell, member);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var loaded = await db.StructureChurches
                .Include(c => c.Template!.Layers)
                .Include(c => c.Nodes)
                .Include(c => c.Members)
                .SingleAsync(c => c.Id == church.Id);

            Assert.NotNull(loaded.Template);
            Assert.Equal(3, loaded.Template!.Layers.Count);
            Assert.Equal(3, loaded.Nodes.Count);
            Assert.Single(loaded.Members);
            Assert.Equal("Kay", loaded.Members.First().Name);
            Assert.Equal(cell.Id, loaded.Members.First().ParentNodeId);
        }
    }

    [Fact]
    public async Task Fellowship_can_exist_without_pfcc()
    {
        var church = StructureSeed.Church();
        var fellowship = StructureSeed.Fellowship(church, pfcc: null);
        var cell = StructureSeed.Cell(church, fellowship);

        await using (var db = fx.CreateContext())
        {
            db.AddRange(church, fellowship, cell);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var loaded = await db.StructureFellowships.SingleAsync(f => f.Id == fellowship.Id);
            Assert.Null(loaded.PfccId);
        }
    }

    [Fact]
    public async Task Role_assignment_links_auth_user_to_node_scope()
    {
        var church = StructureSeed.Church();
        var template = StructureSeed.Template(
            church,
            (StructureLayerType.Fellowship, "Fellowship"),
            (StructureLayerType.Cell, "Cell"));
        var fellowshipLayer = template.Layers.Single(l => l.StandardType == StructureLayerType.Fellowship);
        var cellLayer = template.Layers.Single(l => l.StandardType == StructureLayerType.Cell);
        var fellowship = StructureSeed.Node(church, fellowshipLayer, "Fellowship A");
        var cell = StructureSeed.Node(church, cellLayer, "Cell 1", fellowship);
        var authUserId = Guid.NewGuid();
        var assignment = StructureSeed.CellLeaderRole(church, authUserId, cell);

        await using (var db = fx.CreateContext())
        {
            db.AddRange(church, template, fellowship, cell, assignment);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var loaded = await db.RoleAssignments.SingleAsync(r => r.Id == assignment.Id);
            Assert.Equal(ChurchRole.CellLeader, loaded.Role);
            Assert.Equal(cell.Id, loaded.ScopeNodeId);
            Assert.Equal(authUserId, loaded.AuthUserId);
        }
    }

    [Fact]
    public async Task Member_parent_node_must_belong_to_same_church()
    {
        var churchA = StructureSeed.Church("A");
        var churchB = StructureSeed.Church("B");
        var templateA = StructureSeed.Template(
            churchA,
            (StructureLayerType.Fellowship, "Fellowship"),
            (StructureLayerType.Cell, "Cell"));
        var fellowshipLayer = templateA.Layers.Single(l => l.StandardType == StructureLayerType.Fellowship);
        var cellLayer = templateA.Layers.Single(l => l.StandardType == StructureLayerType.Cell);
        var fellowship = StructureSeed.Node(churchA, fellowshipLayer, "Fellowship A");
        var cell = StructureSeed.Node(churchA, cellLayer, "Cell 1", fellowship);
        var member = new Member
        {
            ChurchId = churchB.Id,
            ParentNodeId = cell.Id,
            Name = "Wrong church",
        };

        await using var db = fx.CreateContext();
        db.AddRange(churchA, churchB, templateA, fellowship, cell, member);

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }
}
