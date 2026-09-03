using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.AspNetCore.Identity;

namespace KairosPayHub.Api.Services;

public class StructureLeaderAccountService(UserManager<ApplicationUser> users, KairosDbContext db)
{
    public async Task<Guid> ProvisionLoginAsync(
        Guid churchId,
        Guid scopeNodeId,
        StructureLayerType layerType,
        Member member,
        string email,
        CancellationToken ct = default)
    {
        var normalizedEmail = email.Trim();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
            throw new BadRequestException("Leader email is required to create a login");

        var existing = await users.FindByEmailAsync(normalizedEmail);
        if (existing is not null)
            throw new BadRequestException("A login account with this email already exists");

        var identityUser = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = normalizedEmail,
            Email = normalizedEmail,
            DisplayName = member.Name,
            EmailConfirmed = false,
        };

        var result = await users.CreateAsync(identityUser);
        if (!result.Succeeded)
            throw new BadRequestException(string.Join("; ", result.Errors.Select(e => e.Description)));

        member.Email = normalizedEmail;
        member.AuthUserId = identityUser.Id;

        var churchRole = ChurchRoleForLayer(layerType);
        db.RoleAssignments.Add(new RoleAssignment
        {
            ChurchId = churchId,
            AuthUserId = identityUser.Id,
            Role = churchRole,
            ScopeNodeId = scopeNodeId,
        });

        return identityUser.Id;
    }

    public void AssignLeaderRole(
        Guid churchId,
        Guid authUserId,
        ChurchRole role,
        Guid scopeNodeId)
    {
        db.RoleAssignments.Add(new RoleAssignment
        {
            ChurchId = churchId,
            AuthUserId = authUserId,
            Role = role,
            ScopeNodeId = scopeNodeId,
        });
    }

    private static ChurchRole ChurchRoleForLayer(StructureLayerType layerType) =>
        layerType switch
        {
            StructureLayerType.PFCC => ChurchRole.PFCCManager,
            StructureLayerType.Fellowship => ChurchRole.FellowshipLeader,
            StructureLayerType.Cell => ChurchRole.CellLeader,
            _ => throw new BadRequestException("Login accounts are not supported for this layer type"),
        };
}
