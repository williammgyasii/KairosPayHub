using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Tests.Integration;

public static class StructureSeed
{
    public static Church Church(string name = "Grace Assembly") =>
        new() { Name = name };

    public static StructureTemplate Template(Church church, params (StructureLayerType type, string label)[] layers)
    {
        var template = new StructureTemplate { ChurchId = church.Id, Church = church };
        for (var i = 0; i < layers.Length; i++)
        {
            template.Layers.Add(new StructureLayer
            {
                Template = template,
                SortOrder = i,
                StandardType = layers[i].type,
                DisplayName = layers[i].label,
            });
        }

        return template;
    }

    public static StructureNode Node(
        Church church,
        StructureLayer layer,
        string name,
        StructureNode? parent = null) =>
        new()
        {
            ChurchId = church.Id,
            LayerId = layer.Id,
            Layer = layer,
            ParentNodeId = parent?.Id,
            ParentNode = parent,
            Name = name,
        };

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

    public static Member Member(Church church, StructureNode parentNode, string name = "Kay", string? email = null) =>
        new()
        {
            ChurchId = church.Id,
            ParentNodeId = parentNode.Id,
            ParentNode = parentNode,
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

    public static RoleAssignment CellLeaderRole(Church church, Guid authUserId, StructureNode cellNode) =>
        new()
        {
            ChurchId = church.Id,
            AuthUserId = authUserId,
            Role = ChurchRole.CellLeader,
            ScopeNodeId = cellNode.Id,
        };
}
