using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record ProgramCreatorDisplay(string? Name, string? ScopeUnitName);

public static class GivingProgramCreatorResolver
{
    public static async Task<ProgramCreatorDisplay> ResolveAsync(
        KairosDbContext db,
        Guid churchId,
        Guid authUserId,
        ChurchRole? role,
        CancellationToken ct = default)
    {
        var map = await ResolveManyAsync(db, churchId, [(authUserId, role)], ct);
        return map.TryGetValue(authUserId, out var display)
            ? display
            : new ProgramCreatorDisplay(null, null);
    }

    public static async Task<IReadOnlyDictionary<Guid, ProgramCreatorDisplay>> ResolveForProgramsAsync(
        KairosDbContext db,
        Guid churchId,
        IEnumerable<(Guid AuthUserId, ChurchRole? Role)> creators,
        CancellationToken ct = default) =>
        await ResolveManyAsync(db, churchId, creators, ct);

    private static async Task<IReadOnlyDictionary<Guid, ProgramCreatorDisplay>> ResolveManyAsync(
        KairosDbContext db,
        Guid churchId,
        IEnumerable<(Guid AuthUserId, ChurchRole? Role)> creators,
        CancellationToken ct)
    {
        var creatorList = creators.Distinct().ToList();
        if (creatorList.Count == 0)
            return new Dictionary<Guid, ProgramCreatorDisplay>();

        var authUserIds = creatorList.Select(c => c.AuthUserId).Distinct().ToList();

        var memberNames = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId && m.AuthUserId != null && authUserIds.Contains(m.AuthUserId.Value))
            .Select(m => new { AuthUserId = m.AuthUserId!.Value, m.Name })
            .ToListAsync(ct);

        var identityNames = await db.Users.AsNoTracking()
            .Where(u => authUserIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToListAsync(ct);

        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == churchId && authUserIds.Contains(r.AuthUserId))
            .Select(r => new { r.AuthUserId, r.Role, r.ScopeNodeId })
            .ToListAsync(ct);

        var scopeNodeIds = assignments
            .Where(a => a.ScopeNodeId != null)
            .Select(a => a.ScopeNodeId!.Value)
            .Distinct()
            .ToList();

        var nodeNames = scopeNodeIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.StructureNodes.AsNoTracking()
                .Where(n => n.ChurchId == churchId && scopeNodeIds.Contains(n.Id))
                .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        string? NameFor(Guid authUserId)
        {
            var memberName = memberNames.FirstOrDefault(m => m.AuthUserId == authUserId)?.Name;
            if (!string.IsNullOrWhiteSpace(memberName))
                return memberName;

            var displayName = identityNames.FirstOrDefault(u => u.Id == authUserId)?.DisplayName;
            return string.IsNullOrWhiteSpace(displayName) ? null : displayName;
        }

        string? ScopeFor(Guid authUserId, ChurchRole? role)
        {
            if (role == ChurchRole.Pastor)
                return null;

            var assignment = assignments.FirstOrDefault(a =>
                a.AuthUserId == authUserId && (role is null || a.Role == role));

            assignment ??= assignments.FirstOrDefault(a => a.AuthUserId == authUserId);

            if (assignment?.ScopeNodeId is not Guid nodeId)
                return null;

            return nodeNames.TryGetValue(nodeId, out var name) ? name : null;
        }

        var result = new Dictionary<Guid, ProgramCreatorDisplay>();
        foreach (var (authUserId, role) in creatorList)
        {
            result[authUserId] = new ProgramCreatorDisplay(NameFor(authUserId), ScopeFor(authUserId, role));
        }

        return result;
    }
}
