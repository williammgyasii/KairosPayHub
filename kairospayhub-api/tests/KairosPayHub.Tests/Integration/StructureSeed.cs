using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Tests.Integration;

public static class StructureSeed
{
    public static Church Church(string name = "Grace Assembly") =>
        new() { Name = name };

    public static Pfcc Pfcc(Church church, string name = "PFCC One") =>
        new() { ChurchId = church.Id, Name = name };

    public static Fellowship Fellowship(
        Church church,
        string name = "Fellowship A",
        Pfcc? pfcc = null) =>
        new()
        {
            ChurchId = church.Id,
            PfccId = pfcc?.Id,
            Name = name,
        };

    public static Cell Cell(Church church, Fellowship fellowship, string name = "Cell 1") =>
        new()
        {
            ChurchId = church.Id,
            FellowshipId = fellowship.Id,
            Name = name,
        };

    public static Member Member(Church church, Cell cell, string name = "Kay", string? email = null) =>
        new()
        {
            ChurchId = church.Id,
            CellId = cell.Id,
            Name = name,
            Email = email,
        };

    public static RoleAssignment PastorRole(Church church, Guid authUserId) =>
        new()
        {
            ChurchId = church.Id,
            AuthUserId = authUserId,
            Role = ChurchRole.Pastor,
        };

    public static RoleAssignment CellLeaderRole(Church church, Guid authUserId, Cell cell) =>
        new()
        {
            ChurchId = church.Id,
            AuthUserId = authUserId,
            Role = ChurchRole.CellLeader,
            ScopeCellId = cell.Id,
            ScopeFellowshipId = cell.FellowshipId,
        };
}
