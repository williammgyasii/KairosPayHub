using KairosPayHub.Api.Domain;

namespace KairosPayHub.Tests.Integration;

/// <summary>Factory helpers for building valid entities in integration tests.</summary>
public static class Seed
{
    public static readonly DateTimeOffset DefaultDate =
        new(2026, 7, 1, 0, 0, 0, TimeSpan.Zero);

    public static Organization Org(string name = "Org") => new() { Name = name };

    public static Church Church(Organization org, string name = "Avenue") =>
        new() { OrganizationId = org.Id, Name = name };

    public static User User(Organization org, Role role, Church? church = null, string? email = null) =>
        new()
        {
            OrganizationId = org.Id,
            Role = role,
            ChurchId = church?.Id,
            AuthSubject = "sub-" + Guid.NewGuid(),
            Name = role.ToString(),
            Email = email ?? $"{Guid.NewGuid()}@example.com",
        };

    public static Record Record(
        Organization org,
        Church church,
        User submitter,
        decimal amount = 500.00m) =>
        new()
        {
            OrganizationId = org.Id,
            ChurchId = church.Id,
            SubmittedById = submitter.Id,
            Amount = amount,
            DateSent = DefaultDate,
            Method = PaymentMethod.MobileMoney,
        };
}
