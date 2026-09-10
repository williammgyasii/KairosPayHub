namespace KairosPayHub.Api.Auth;

public enum OneTimeTokenPurpose
{
    SetPassword,
    PasswordReset,
}

public class OneTimeToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public OneTimeTokenPurpose Purpose { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
}

public class EmailConfirmationCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
}
