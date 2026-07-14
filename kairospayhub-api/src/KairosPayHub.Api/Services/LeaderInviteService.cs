using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using ForbiddenException = KairosPayHub.Api.Domain.ForbiddenException;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Pastor invites a leader into their own org: creates the Cognito user
/// (Cognito emails a temporary password) and writes the matching User row.
/// Role/tenant live in our DB, so no Cognito groups or custom attributes.
/// </summary>
public class LeaderInviteService(
    IAmazonCognitoIdentityProvider cognito,
    KairosDbContext db,
    ChurchService churches,
    IConfiguration config)
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

        var userPoolId = config["Cognito:UserPoolId"]
            ?? throw new InvalidOperationException("Cognito:UserPoolId is not configured");

        var created = await cognito.AdminCreateUserAsync(new AdminCreateUserRequest
        {
            UserPoolId = userPoolId,
            Username = email,
            UserAttributes =
            [
                new AttributeType { Name = "email", Value = email },
                new AttributeType { Name = "email_verified", Value = "true" },
                new AttributeType { Name = "name", Value = name },
            ],
            DesiredDeliveryMediums = [DeliveryMediumType.EMAIL],
        }, ct);

        var sub = created.User.Attributes.First(a => a.Name == "sub").Value;

        var user = new User
        {
            OrganizationId = actor.OrganizationId,
            ChurchId = churchId,
            CognitoSub = sub,
            Name = name,
            Email = email,
            Role = Role.Leader,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }
}
