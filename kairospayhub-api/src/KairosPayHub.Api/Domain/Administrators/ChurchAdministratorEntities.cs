using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Api.Domain.Administrators;

public enum ChurchAdminAffiliationKind
{
    InChurch,
    External,
}

public class ChurchAdministrator
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public Domain.Structure.Church? Church { get; set; }
    public Guid AuthUserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public ChurchAdminAffiliationKind AffiliationKind { get; set; }
    public Guid? MemberId { get; set; }
    public Member? Member { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid CreatedByAuthUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? DeactivatedByAuthUserId { get; set; }
    public DateTimeOffset? DeactivatedAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}
