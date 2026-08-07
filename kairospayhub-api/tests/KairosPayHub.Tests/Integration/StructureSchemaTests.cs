using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureSchemaTests(PostgresFixture fx) : IAsyncLifetime
{
    public Task InitializeAsync() => fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Can_persist_church_hierarchy_with_pfcc()
    {
        var church = StructureSeed.Church();
        var pfcc = StructureSeed.Pfcc(church);
        var fellowship = StructureSeed.Fellowship(church, pfcc: pfcc);
        var cell = StructureSeed.Cell(church, fellowship);
        var member = StructureSeed.Member(church, cell, "Kay", "kay@example.com");

        await using (var db = fx.CreateContext())
        {
            db.AddRange(church, pfcc, fellowship, cell, member);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var loaded = await db.StructureChurches
                .Include(c => c.Pfccs)
                .Include(c => c.Fellowships)
                .Include(c => c.Cells)
                .Include(c => c.Members)
                .SingleAsync(c => c.Id == church.Id);

            Assert.Single(loaded.Pfccs);
            Assert.Single(loaded.Fellowships);
            Assert.Equal(pfcc.Id, loaded.Fellowships.First().PfccId);
            Assert.Single(loaded.Cells);
            Assert.Single(loaded.Members);
            Assert.Equal("Kay", loaded.Members.First().Name);
            Assert.True(loaded.Members.First().CreatedAt > DateTimeOffset.MinValue);
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
    public async Task Role_assignment_links_auth_user_to_church_scope()
    {
        var church = StructureSeed.Church();
        var fellowship = StructureSeed.Fellowship(church);
        var cell = StructureSeed.Cell(church, fellowship);
        var authUserId = Guid.NewGuid();
        var assignment = StructureSeed.CellLeaderRole(church, authUserId, cell);

        await using (var db = fx.CreateContext())
        {
            db.AddRange(church, fellowship, cell, assignment);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var loaded = await db.RoleAssignments.SingleAsync(r => r.Id == assignment.Id);
            Assert.Equal(ChurchRole.CellLeader, loaded.Role);
            Assert.Equal(cell.Id, loaded.ScopeCellId);
            Assert.Equal(fellowship.Id, loaded.ScopeFellowshipId);
            Assert.Equal(authUserId, loaded.AuthUserId);
        }
    }

    [Fact]
    public async Task Member_cell_must_belong_to_same_church()
    {
        var churchA = StructureSeed.Church("A");
        var churchB = StructureSeed.Church("B");
        var fellowshipA = StructureSeed.Fellowship(churchA);
        var cellA = StructureSeed.Cell(churchA, fellowshipA);
        var member = StructureSeed.Member(churchB, cellA);

        await using var db = fx.CreateContext();
        db.AddRange(churchA, churchB, fellowshipA, cellA, member);

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }
}
