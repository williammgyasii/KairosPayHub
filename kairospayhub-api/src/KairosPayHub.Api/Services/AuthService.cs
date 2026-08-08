using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public record AuthTokens(string AccessToken, string RefreshToken, int ExpiresInSeconds, bool EmailConfirmed);

public class AuthService(
    UserManager<ApplicationUser> users,
    KairosDbContext db,
    JwtTokenService jwt,
    IEmailSender email,
    IOptions<JwtOptions> jwtOptions,
    IOptions<EmailOptions> emailOptions,
    IHostEnvironment environment)
{
    public async Task RegisterAsync(string name, string emailAddress, string password, CancellationToken ct = default)
    {
        var existing = await users.FindByEmailAsync(emailAddress);
        if (existing is not null)
            throw new AuthException("An account with this email already exists");

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = emailAddress,
            Email = emailAddress,
            DisplayName = name.Trim(),
        };

        var result = await users.CreateAsync(user, password);
        if (!result.Succeeded)
            throw new AuthException(FormatErrors(result));

        await SendConfirmationCodeAsync(user, ct);
    }

    public async Task ConfirmEmailAsync(string emailAddress, string code, CancellationToken ct = default)
    {
        var user = await users.FindByEmailAsync(emailAddress)
            ?? throw new AuthException("Invalid confirmation code");

        var row = await db.EmailConfirmationCodes
            .Where(c => c.UserId == user.Id && c.Code == code && c.ExpiresAt > DateTimeOffset.UtcNow)
            .OrderByDescending(c => c.ExpiresAt)
            .FirstOrDefaultAsync(ct)
            ?? throw new AuthException("Invalid confirmation code");

        user.EmailConfirmed = true;
        await users.UpdateAsync(user);
        db.EmailConfirmationCodes.Remove(row);
        await db.SaveChangesAsync(ct);
    }

    public async Task ResendConfirmationAsync(string emailAddress, CancellationToken ct = default)
    {
        var user = await users.FindByEmailAsync(emailAddress);
        if (user is null || user.EmailConfirmed)
            return;

        await SendConfirmationCodeAsync(user, ct);
    }

    public async Task<AuthTokens> LoginAsync(string emailAddress, string password, CancellationToken ct = default)
    {
        var user = await users.FindByEmailAsync(emailAddress)
            ?? throw new AuthException("Invalid email or password");

        if (!await users.CheckPasswordAsync(user, password))
            throw new AuthException("Invalid email or password");

        if (!user.EmailConfirmed)
            await SendConfirmationCodeAsync(user, ct);

        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthTokens> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = TokenUtil.HashToken(refreshToken);
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash && !t.Revoked && t.ExpiresAt > DateTimeOffset.UtcNow, ct)
            ?? throw new AuthException("Invalid refresh token");

        stored.Revoked = true;

        var user = await users.FindByIdAsync(stored.UserId.ToString())
            ?? throw new AuthException("Invalid refresh token");

        var tokens = await IssueTokensAsync(user, ct);
        await db.SaveChangesAsync(ct);
        return tokens;
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = TokenUtil.HashToken(refreshToken);
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash && !t.Revoked, ct);
        if (stored is null) return;

        stored.Revoked = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task<string?> ForgotPasswordAsync(string emailAddress, CancellationToken ct = default)
    {
        var user = await users.FindByEmailAsync(emailAddress);
        if (user is null) return null;

        var token = await CreateOneTimeTokenAsync(user.Id, OneTimeTokenPurpose.PasswordReset, TimeSpan.FromHours(1), ct);
        var link = $"{emailOptions.Value.FrontendBaseUrl.TrimEnd('/')}/reset-password?token={token}";
        await email.SendAsync(user.Email!,
            "Reset your KairosPayHub password",
            $"Use this link to reset your password (expires in 1 hour):\n\n{link}",
            ct);

        return environment.IsDevelopment() ? link : null;
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default)
    {
        var userId = await ConsumeOneTimeTokenAsync(token, OneTimeTokenPurpose.PasswordReset, ct)
            ?? throw new AuthException("Invalid or expired reset link");

        var user = await users.FindByIdAsync(userId.ToString())
            ?? throw new AuthException("Invalid or expired reset link");

        var resetToken = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, resetToken, newPassword);
        if (!result.Succeeded)
            throw new AuthException(FormatErrors(result));
    }

    public async Task SetPasswordAsync(string token, string newPassword, CancellationToken ct = default)
    {
        var userId = await ConsumeOneTimeTokenAsync(token, OneTimeTokenPurpose.SetPassword, ct)
            ?? throw new AuthException("Invalid or expired invite link");

        var user = await users.FindByIdAsync(userId.ToString())
            ?? throw new AuthException("Invalid or expired invite link");

        user.EmailConfirmed = true;
        var resetToken = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, resetToken, newPassword);
        if (!result.Succeeded)
            throw new AuthException(FormatErrors(result));

        await users.UpdateAsync(user);
    }

    public async Task<string> CreateSetPasswordTokenAsync(Guid userId, CancellationToken ct = default) =>
        await CreateOneTimeTokenAsync(userId, OneTimeTokenPurpose.SetPassword, TimeSpan.FromDays(7), ct);

    private async Task SendConfirmationCodeAsync(ApplicationUser user, CancellationToken ct)
    {
        var old = await db.EmailConfirmationCodes.Where(c => c.UserId == user.Id).ToListAsync(ct);
        db.EmailConfirmationCodes.RemoveRange(old);

        var code = TokenUtil.NewEmailCode();
        db.EmailConfirmationCodes.Add(new EmailConfirmationCode
        {
            UserId = user.Id,
            Code = code,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15),
        });
        await db.SaveChangesAsync(ct);

        await email.SendAsync(user.Email!,
            "Confirm your KairosPayHub email",
            $"Your confirmation code is: {code}\n\nIt expires in 15 minutes.",
            ct);
    }

    private async Task<AuthTokens> IssueTokensAsync(ApplicationUser user, CancellationToken ct)
    {
        var access = jwt.CreateAccessToken(user);
        var refresh = TokenUtil.NewRefreshToken();
        var cfg = jwtOptions.Value;

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = TokenUtil.HashToken(refresh),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(cfg.RefreshTokenDays),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        return new AuthTokens(access, refresh, cfg.AccessTokenMinutes * 60, user.EmailConfirmed);
    }

    private async Task<string> CreateOneTimeTokenAsync(
        Guid userId, OneTimeTokenPurpose purpose, TimeSpan ttl, CancellationToken ct)
    {
        var raw = TokenUtil.NewOneTimeToken();
        db.OneTimeTokens.Add(new OneTimeToken
        {
            UserId = userId,
            Purpose = purpose,
            TokenHash = TokenUtil.HashToken(raw),
            ExpiresAt = DateTimeOffset.UtcNow.Add(ttl),
        });
        await db.SaveChangesAsync(ct);
        return raw;
    }

    private async Task<Guid?> ConsumeOneTimeTokenAsync(
        string token, OneTimeTokenPurpose purpose, CancellationToken ct)
    {
        var hash = TokenUtil.HashToken(token);
        var row = await db.OneTimeTokens
            .FirstOrDefaultAsync(t =>
                t.TokenHash == hash
                && t.Purpose == purpose
                && t.UsedAt == null
                && t.ExpiresAt > DateTimeOffset.UtcNow, ct);
        if (row is null) return null;

        row.UsedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return row.UserId;
    }

    private static string FormatErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(e => e.Description));
}

public class AuthException(string message) : Exception(message);
