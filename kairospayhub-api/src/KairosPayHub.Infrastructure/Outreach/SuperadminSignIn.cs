using System.Security.Claims;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Outreach;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Outreach;

public class SuperadminSignIn(
    KairosDbContext db,
    JwtTokenService jwt,
    IPasswordHasher<SuperadminOperator> hasher)
{
    public const string OperatorClaim = "operator";
    public const string OperatorValue = "superadmin";

    public async Task<string?> SignInAsync(string? email, string? password, CancellationToken ct)
    {
        var normalized = Normalize(email);
        if (normalized is null || string.IsNullOrEmpty(password)) return null;

        var row = await db.SuperadminOperators.SingleOrDefaultAsync(o => o.Email == normalized, ct);
        if (row is null) return null;
        if (hasher.VerifyHashedPassword(row, row.PasswordHash, password) == PasswordVerificationResult.Failed)
            return null;

        return jwt.CreateOperatorToken(row.Email);
    }

    public async Task<bool> IsOperatorAsync(ClaimsPrincipal user, CancellationToken ct)
    {
        if (user.FindFirstValue(OperatorClaim) != OperatorValue) return false;
        var email = Normalize(user.FindFirstValue("email") ?? user.FindFirstValue(ClaimTypes.Email));
        if (email is null) return false;
        return await db.SuperadminOperators.AnyAsync(o => o.Email == email, ct);
    }

    private static string? Normalize(string? email)
    {
        var value = email?.Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
