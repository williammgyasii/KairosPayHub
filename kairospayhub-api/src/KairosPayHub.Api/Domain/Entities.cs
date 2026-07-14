namespace KairosPayHub.Api.Domain;

public class Organization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Church> Churches { get; set; } = new List<Church>();
    public ICollection<User> Users { get; set; } = new List<User>();
}

public class Church
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public string CognitoSub { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Role Role { get; set; }
    public Guid? ChurchId { get; set; }
    public Church? Church { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class Record
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid ChurchId { get; set; }
    public Church? Church { get; set; }
    public Guid SubmittedById { get; set; }
    public User? SubmittedBy { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "GHS";
    public DateTimeOffset DateSent { get; set; }
    public PaymentMethod Method { get; set; }
    public RecordSource Source { get; set; } = RecordSource.Manual;
    public string? Reference { get; set; }
    public RecordStatus Status { get; set; } = RecordStatus.Submitted;
    public Guid? VerifiedById { get; set; }
    public User? VerifiedBy { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
