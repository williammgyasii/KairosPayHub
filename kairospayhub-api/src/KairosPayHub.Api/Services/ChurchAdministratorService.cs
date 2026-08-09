using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Administrators;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Services;

public record CreateChurchAdministratorInput(
    string FirstName,
    string LastName,
    string Email,
    string AffiliationKind,
    Guid? MemberId,
    string? Password,
    bool SendInviteEmail);

public record ChurchAdministratorDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string AffiliationKind,
    Guid? MemberId,
    string? MemberName,
    bool IsActive,
    DateTimeOffset CreatedAt);

public class ChurchAdministratorService(
    KairosDbContext db,
    GivingScopeService scope,
    UserManager<ApplicationUser> users,
    AuthService auth,
    IEmailSender mailSender,
    IOptions<EmailOptions> emailOptions)
{
    public async Task<IReadOnlyList<ChurchAdministratorDto>> ListAsync(
        Actor actor,
        CancellationToken ct = default)
    {
        var churchId = RequireManageChurch(actor);
        return await db.ChurchAdministrators.AsNoTracking()
            .Include(a => a.Member)
            .Where(a => a.ChurchId == churchId)
            .OrderBy(a => a.LastName)
            .ThenBy(a => a.FirstName)
            .Select(a => new ChurchAdministratorDto(
                a.Id,
                a.FirstName,
                a.LastName,
                a.Email,
                a.AffiliationKind.ToString(),
                a.MemberId,
                a.Member != null ? a.Member.Name : null,
                a.IsActive,
                a.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<ChurchAdministratorDto> CreateAsync(
        Actor actor,
        Guid authUserId,
        CreateChurchAdministratorInput input,
        CancellationToken ct = default)
    {
        var churchId = RequireManageChurch(actor);
        ValidateCreateInput(input);

        var email = input.Email.Trim();
        if (await users.FindByEmailAsync(email) is not null)
            throw new BadRequestException("A login account with this email already exists");

        if (input.AffiliationKind.Equals("InChurch", StringComparison.OrdinalIgnoreCase))
        {
            if (input.MemberId is null)
                throw new BadRequestException("MemberId is required for in-church administrators");

            var memberExists = await db.ChurchMembers.AsNoTracking()
                .AnyAsync(m => m.Id == input.MemberId && m.ChurchId == churchId, ct);
            if (!memberExists)
                throw new BadRequestException("Member not found in your church");
        }
        else if (input.MemberId is not null)
        {
            throw new BadRequestException("MemberId must be empty for external administrators");
        }

        var password = input.SendInviteEmail
            ? NewTemporaryPassword()
            : input.Password?.Trim()
              ?? throw new BadRequestException("Password is required when not sending an invite email");

        var identityUser = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            DisplayName = $"{input.FirstName.Trim()} {input.LastName.Trim()}",
            EmailConfirmed = !input.SendInviteEmail,
        };

        var createResult = await users.CreateAsync(identityUser, password);
        if (!createResult.Succeeded)
            throw new BadRequestException(string.Join("; ", createResult.Errors.Select(e => e.Description)));

        var affiliation = ParseAffiliation(input.AffiliationKind);
        var admin = new ChurchAdministrator
        {
            ChurchId = churchId,
            AuthUserId = identityUser.Id,
            FirstName = input.FirstName.Trim(),
            LastName = input.LastName.Trim(),
            Email = email,
            AffiliationKind = affiliation,
            MemberId = input.MemberId,
            CreatedByAuthUserId = authUserId,
        };

        db.RoleAssignments.Add(new RoleAssignment
        {
            ChurchId = churchId,
            AuthUserId = identityUser.Id,
            Role = ChurchRole.ChurchAdmin,
        });
        db.ChurchAdministrators.Add(admin);

        db.AppUsers.Add(new User
        {
            OrganizationId = actor.OrganizationId,
            AuthSubject = identityUser.Id.ToString(),
            Name = admin.FullName,
            Email = email,
            Role = Role.Pastor,
        });

        await db.SaveChangesAsync(ct);

        if (input.SendInviteEmail)
        {
            var token = await auth.CreateSetPasswordTokenAsync(identityUser.Id, ct);
            var link = $"{emailOptions.Value.FrontendBaseUrl.TrimEnd('/')}/set-password?token={token}";
            await mailSender.SendAsync(
                email,
                "You've been added as a church administrator",
                $"Hi {admin.FirstName},\n\nSet your password to access KairosPayHub:\n\n{link}\n\nThis link expires in 7 days.",
                ct);
        }

        string? memberName = null;
        if (admin.MemberId is Guid memberId)
        {
            memberName = await db.ChurchMembers.AsNoTracking()
                .Where(m => m.Id == memberId)
                .Select(m => m.Name)
                .FirstOrDefaultAsync(ct);
        }

        return new ChurchAdministratorDto(
            admin.Id,
            admin.FirstName,
            admin.LastName,
            admin.Email,
            admin.AffiliationKind.ToString(),
            admin.MemberId,
            memberName,
            admin.IsActive,
            admin.CreatedAt);
    }

    public async Task<string> SuggestEmailAsync(string baseEmail, CancellationToken ct = default)
    {
        var trimmed = baseEmail.Trim();
        if (string.IsNullOrWhiteSpace(trimmed) || !trimmed.Contains('@'))
            throw new BadRequestException("A valid base email is required");

        var at = trimmed.LastIndexOf('@');
        var local = trimmed[..at];
        var domain = trimmed[(at + 1)..];

        for (var i = 0; i < 20; i++)
        {
            var suffix = i == 0 ? ".admin" : $".admin{i}";
            var candidate = $"{local}{suffix}@{domain}";
            if (await users.FindByEmailAsync(candidate) is null)
                return candidate;
        }

        throw new BadRequestException("Could not generate an available admin email");
    }

    public async Task DeactivateAsync(
        Actor actor,
        Guid authUserId,
        Guid administratorId,
        CancellationToken ct = default)
    {
        var churchId = RequireManageChurch(actor);
        var admin = await db.ChurchAdministrators
            .SingleOrDefaultAsync(a => a.Id == administratorId && a.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Administrator not found");

        if (!admin.IsActive)
            return;

        admin.IsActive = false;
        admin.DeactivatedByAuthUserId = authUserId;
        admin.DeactivatedAt = DateTimeOffset.UtcNow;

        var assignments = await db.RoleAssignments
            .Where(r => r.ChurchId == churchId && r.AuthUserId == admin.AuthUserId && r.Role == ChurchRole.ChurchAdmin)
            .ToListAsync(ct);
        db.RoleAssignments.RemoveRange(assignments);

        await db.SaveChangesAsync(ct);
    }

    private static ChurchAdminAffiliationKind ParseAffiliation(string value)
    {
        if (!Enum.TryParse<ChurchAdminAffiliationKind>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown affiliation kind: {value}");
        return parsed;
    }

    private static void ValidateCreateInput(CreateChurchAdministratorInput input)
    {
        if (string.IsNullOrWhiteSpace(input.FirstName))
            throw new BadRequestException("First name is required");
        if (string.IsNullOrWhiteSpace(input.LastName))
            throw new BadRequestException("Last name is required");
        if (string.IsNullOrWhiteSpace(input.Email))
            throw new BadRequestException("Email is required");
        if (!input.SendInviteEmail && string.IsNullOrWhiteSpace(input.Password))
            throw new BadRequestException("Password is required when not sending an invite email");
    }

    private Guid RequireManageChurch(Actor actor)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor or church admin can manage administrators");
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    private static string NewTemporaryPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        var pool = upper + lower + digits;
        Span<char> chars = stackalloc char[12];
        chars[0] = upper[Random.Shared.Next(upper.Length)];
        chars[1] = lower[Random.Shared.Next(lower.Length)];
        chars[2] = digits[Random.Shared.Next(digits.Length)];
        for (var i = 3; i < chars.Length; i++)
            chars[i] = pool[Random.Shared.Next(pool.Length)];
        return new string(chars);
    }
}
