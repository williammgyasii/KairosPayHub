using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Email;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Identity;
using ForbiddenException = KairosPayHub.Api.Domain.ForbiddenException;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Pastor invites a leader: creates an Identity account, app User row, and emails
/// a set-password link. Role/tenant live in our DB.
/// </summary>
public class LeaderInviteService(
    UserManager<ApplicationUser> users,
    AuthService auth,
    KairosDbContext db,
    ChurchService churches,
    IEmailSender mailSender,
    Microsoft.Extensions.Options.IOptions<EmailOptions> emailOptions)
{
    public async Task<User> InviteAsync(
        Actor actor,
        string email,
        string name,
        Guid churchId,
        CancellationToken ct = default)
    {
        if (actor.Role != Role.Pastor)
            throw new ForbiddenException("Only a pastor can invite leaders");

        var church = await churches.FindInOrgAsync(actor, churchId, ct)
            ?? throw new ForbiddenException("Church not found in your organization");

        var existingIdentity = await users.FindByEmailAsync(email);
        if (existingIdentity is not null)
            throw new AuthException("A user with this email already exists");

        var identityUser = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            DisplayName = name,
            EmailConfirmed = false,
        };

        var createResult = await users.CreateAsync(identityUser);
        if (!createResult.Succeeded)
            throw new AuthException(string.Join("; ", createResult.Errors.Select(e => e.Description)));

        var user = new User
        {
            OrganizationId = actor.OrganizationId,
            ChurchId = churchId,
            AuthSubject = identityUser.Id.ToString(),
            Name = name,
            Email = email,
            Role = Role.Leader,
        };
        db.AppUsers.Add(user);
        await db.SaveChangesAsync(ct);

        var token = await auth.CreateSetPasswordTokenAsync(identityUser.Id, ct);
        var link = $"{emailOptions.Value.FrontendBaseUrl.TrimEnd('/')}/set-password?token={token}";
        await mailSender.SendAsync(email,
            "You've been invited to KairosPayHub",
            $"Hi {name},\n\nSet your password to join your church team:\n\n{link}\n\nThis link expires in 7 days.",
            ct);

        return user;
    }
}
