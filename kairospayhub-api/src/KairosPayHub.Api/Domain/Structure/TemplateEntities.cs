namespace KairosPayHub.Api.Domain.Structure;

public class StructureTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public string Name { get; set; } = "Main structure";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LockedAt { get; set; }

    public ICollection<StructureLayer> Layers { get; set; } = new List<StructureLayer>();
}

public class StructureLayer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TemplateId { get; set; }
    public StructureTemplate? Template { get; set; }
    public int SortOrder { get; set; }
    public StructureLayerType StandardType { get; set; }
    public string DisplayName { get; set; } = string.Empty;

    public ICollection<StructureNode> Nodes { get; set; } = new List<StructureNode>();
}

public class StructureNode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public Guid LayerId { get; set; }
    public StructureLayer? Layer { get; set; }
    public Guid? ParentNodeId { get; set; }
    public StructureNode? ParentNode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? UnitNumber { get; set; }
    public Guid? LeaderMemberId { get; set; }
    public Member? Leader { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<StructureNode> Children { get; set; } = new List<StructureNode>();
    public ICollection<Member> Members { get; set; } = new List<Member>();
}
