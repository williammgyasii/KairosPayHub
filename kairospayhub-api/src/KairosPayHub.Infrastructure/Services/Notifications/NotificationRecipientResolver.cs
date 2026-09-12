using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Structure-aware who-to-notify for approval hops. Uses the same next role as approve.
/// </summary>
public class NotificationRecipientResolver(KairosDbContext db, GivingScopeService scope)
{
    public async Task<List<Guid>> PastorAuthUserIdsAsync(Guid churchId, CancellationToken ct) =>
        await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == churchId && r.Role == ChurchRole.Pastor)
            .Select(r => r.AuthUserId)
            .Distinct()
            .ToListAsync(ct);

    public async Task<List<Guid>> ForChurchLeadersAndAdminsAsync(
        Guid churchId,
        Guid? excludeAuthUserId,
        CancellationToken ct)
    {
        var recipients = new HashSet<Guid>(await PastorAuthUserIdsAsync(churchId, ct));
        var others = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.Role != ChurchRole.Member
                && r.Role != ChurchRole.Pastor)
            .Select(r => r.AuthUserId)
            .ToListAsync(ct);
        foreach (var id in others)
            recipients.Add(id);

        if (excludeAuthUserId is Guid excluded)
            recipients.Remove(excluded);

        return recipients.ToList();
    }

    public async Task<List<Guid>> ForContributionApprovalAsync(
        Guid churchId,
        ChurchRole? enteredByRole,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        var approvingRole = await scope.ResolveContributionApprovingRoleAsync(
            churchId,
            enteredByRole,
            ct);
        if (approvingRole is null)
            return [];

        return await AuthUserIdsForApprovingRoleAsync(
            churchId,
            approvingRole.Value,
            memberParentNodeId,
            ct);
    }

    /// <summary>
    /// Next-hop recipients for attendance pending approval (same skip-missing-layers chain as giving).
    /// </summary>
    /// <summary>
    /// Leaders who should receive a meeting pack. Church-wide = all non-pastor leaders.
    /// Scoped = leaders whose assignment intersects that unit. Not members, not pastors.
    /// </summary>
    public async Task<List<Guid>> ForMeetingPackLeadersAsync(
        Guid churchId,
        Guid? scopeNodeId,
        Guid? excludeAuthUserId,
        CancellationToken ct)
    {
        var recipients = new HashSet<Guid>();
        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.Role != ChurchRole.Member
                && r.Role != ChurchRole.Pastor
                && r.Role != ChurchRole.ChurchAdmin)
            .ToListAsync(ct);

        if (scopeNodeId is null)
        {
            foreach (var assignment in assignments)
                recipients.Add(assignment.AuthUserId);
        }
        else
        {
            foreach (var assignment in assignments)
            {
                if (assignment.ScopeNodeId is null)
                    continue;
                var viewerRoot = assignment.ScopeNodeId.Value;
                if (viewerRoot == scopeNodeId.Value
                    || await scope.IsNodeInSubtreeAsync(churchId, viewerRoot, scopeNodeId.Value, ct)
                    || await scope.IsNodeInSubtreeAsync(churchId, scopeNodeId.Value, viewerRoot, ct))
                {
                    recipients.Add(assignment.AuthUserId);
                }
            }
        }

        if (excludeAuthUserId is Guid excluded)
            recipients.Remove(excluded);

        return recipients.ToList();
    }

    public Task<List<Guid>> ForAttendanceApprovalAsync(
        Guid churchId,
        ChurchRole? enteredByRole,
        Guid scopeNodeId,
        CancellationToken ct) =>
        ForContributionApprovalAsync(churchId, enteredByRole, scopeNodeId, ct);

    async Task<List<Guid>> AuthUserIdsForApprovingRoleAsync(
        Guid churchId,
        ChurchRole approvingRole,
        Guid memberParentNodeId,
        CancellationToken ct) =>
        approvingRole switch
        {
            ChurchRole.Pastor => await PastorAuthUserIdsAsync(churchId, ct),
            ChurchRole.PFCCManager => await RoleAuthUserIdsCoveringMemberAsync(
                churchId,
                ChurchRole.PFCCManager,
                memberParentNodeId,
                ct),
            ChurchRole.FellowshipLeader => await RoleAuthUserIdsCoveringMemberAsync(
                churchId,
                ChurchRole.FellowshipLeader,
                memberParentNodeId,
                ct),
            _ => [],
        };

    async Task<List<Guid>> RoleAuthUserIdsCoveringMemberAsync(
        Guid churchId,
        ChurchRole role,
        Guid memberParentNodeId,
        CancellationToken ct)
    {
        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == churchId
                && r.Role == role
                && r.ScopeNodeId != null)
            .ToListAsync(ct);

        var result = new List<Guid>();
        foreach (var assignment in assignments)
        {
            var subtree = await scope.CollectSubtreeNodeIdsAsync(
                churchId,
                assignment.ScopeNodeId!.Value,
                ct);
            if (subtree.Contains(memberParentNodeId))
                result.Add(assignment.AuthUserId);
        }

        return result.Distinct().ToList();
    }
}
