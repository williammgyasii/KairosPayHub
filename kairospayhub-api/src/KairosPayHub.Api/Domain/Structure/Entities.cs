namespace KairosPayHub.Api.Domain.Structure;

/// <summary>MVP church tenant (local church). Table: church_tenants — distinct from legacy churches.</summary>
public class Church
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Pfcc> Pfccs { get; set; } = new List<Pfcc>();
    public ICollection<Fellowship> Fellowships { get; set; } = new List<Fellowship>();
    public ICollection<Cell> Cells { get; set; } = new List<Cell>();
    public ICollection<Member> Members { get; set; } = new List<Member>();
    public ICollection<RoleAssignment> RoleAssignments { get; set; } = new List<RoleAssignment>();
}

public class Pfcc
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Fellowship> Fellowships { get; set; } = new List<Fellowship>();
}

public class Fellowship
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public Guid? PfccId { get; set; }
    public Pfcc? Pfcc { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Cell> Cells { get; set; } = new List<Cell>();
}

public class Cell
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public Guid FellowshipId { get; set; }
    public Fellowship? Fellowship { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Member> Members { get; set; } = new List<Member>();
}

public class Member
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public Guid CellId { get; set; }
    public Cell? Cell { get; set; }
    public Guid? AuthUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class RoleAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public Guid AuthUserId { get; set; }
    public ChurchRole Role { get; set; }
    public Guid? ScopePfccId { get; set; }
    public Pfcc? ScopePfcc { get; set; }
    public Guid? ScopeFellowshipId { get; set; }
    public Fellowship? ScopeFellowship { get; set; }
    public Guid? ScopeCellId { get; set; }
    public Cell? ScopeCell { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
