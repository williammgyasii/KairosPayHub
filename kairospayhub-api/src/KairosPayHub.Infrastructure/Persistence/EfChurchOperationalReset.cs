using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Services;
using KairosPayHub.Application.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Infrastructure;

/// <summary>
/// EF adapter for <see cref="IChurchOperationalReset"/>. Delete order is
/// persistence: giving/attendance before members (Restrict on MemberId),
/// then nodes deepest-first, then the template.
/// </summary>
public sealed class EfChurchOperationalReset(KairosDbContext db, ChurchReadCache readCache)
    : IChurchOperationalReset
{
    public async Task ResetAsync(Guid churchId, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var programIds = await db.GivingPrograms
            .Where(p => p.ChurchId == churchId)
            .Select(p => p.Id)
            .ToListAsync(ct);
        if (programIds.Count > 0)
        {
            await db.Contributions.Where(c => programIds.Contains(c.ProgramId)).ExecuteDeleteAsync(ct);
            await db.GivingProgramScopeNodes.Where(s => programIds.Contains(s.ProgramId)).ExecuteDeleteAsync(ct);
            await db.GivingPrograms
                .Where(p => p.ChurchId == churchId && p.ParentProgramId != null)
                .ExecuteDeleteAsync(ct);
            await db.GivingPrograms.Where(p => p.ChurchId == churchId).ExecuteDeleteAsync(ct);
        }

        var occurrenceIds = await db.AttendanceOccurrences
            .Where(o => o.ChurchId == churchId)
            .Select(o => o.Id)
            .ToListAsync(ct);
        if (occurrenceIds.Count > 0)
        {
            await db.AttendanceEntries.Where(e => occurrenceIds.Contains(e.OccurrenceId)).ExecuteDeleteAsync(ct);
            await db.AttendanceInviteeEntries.Where(e => occurrenceIds.Contains(e.OccurrenceId)).ExecuteDeleteAsync(ct);
            await db.AttendanceFirstTimers.Where(f => occurrenceIds.Contains(f.OccurrenceId)).ExecuteDeleteAsync(ct);
            await db.AttendanceScopeSubmissions.Where(s => occurrenceIds.Contains(s.OccurrenceId)).ExecuteDeleteAsync(ct);
            await db.AttendanceOccurrences.Where(o => o.ChurchId == churchId).ExecuteDeleteAsync(ct);
        }

        await db.AttendanceCellInvitees.Where(i => i.ChurchId == churchId).ExecuteDeleteAsync(ct);

        var meetingTypeIds = await db.AttendanceMeetingTypes
            .Where(t => t.ChurchId == churchId)
            .Select(t => t.Id)
            .ToListAsync(ct);
        if (meetingTypeIds.Count > 0)
        {
            await db.AttendanceMeetingTypeScopeNodes
                .Where(s => meetingTypeIds.Contains(s.MeetingTypeId))
                .ExecuteDeleteAsync(ct);
            await db.AttendanceMeetingTypes.Where(t => t.ChurchId == churchId).ExecuteDeleteAsync(ct);
        }

        await db.ChurchCalendarEvents.Where(e => e.ChurchId == churchId).ExecuteDeleteAsync(ct);
        await db.Notifications.Where(n => n.ChurchId == churchId).ExecuteDeleteAsync(ct);

        await db.StructureNodes
            .Where(n => n.ChurchId == churchId)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.LeaderMemberId, (Guid?)null), ct);

        await db.RoleAssignments
            .Where(r => r.ChurchId == churchId && r.Role != ChurchRole.Pastor && r.Role != ChurchRole.ChurchAdmin)
            .ExecuteDeleteAsync(ct);
        await db.RoleAssignments
            .Where(r => r.ChurchId == churchId)
            .ExecuteUpdateAsync(
                s => s
                    .SetProperty(r => r.ScopeNodeId, (Guid?)null)
                    .SetProperty(r => r.ScopePfccId, (Guid?)null)
                    .SetProperty(r => r.ScopeFellowshipId, (Guid?)null)
                    .SetProperty(r => r.ScopeCellId, (Guid?)null),
                ct);

        await db.ChurchMembers.Where(m => m.ChurchId == churchId).ExecuteDeleteAsync(ct);

        var nodeIdsDeepestFirst = await db.StructureNodes
            .Where(n => n.ChurchId == churchId)
            .Join(
                db.StructureLayers,
                n => n.LayerId,
                l => l.Id,
                (n, l) => new { n.Id, l.SortOrder })
            .OrderByDescending(x => x.SortOrder)
            .Select(x => x.Id)
            .ToListAsync(ct);
        foreach (var nodeId in nodeIdsDeepestFirst)
            await db.StructureNodes.Where(n => n.Id == nodeId).ExecuteDeleteAsync(ct);

        await db.StructureCells.Where(c => c.ChurchId == churchId).ExecuteDeleteAsync(ct);
        await db.StructureFellowships.Where(f => f.ChurchId == churchId).ExecuteDeleteAsync(ct);
        await db.Pfccs.Where(p => p.ChurchId == churchId).ExecuteDeleteAsync(ct);

        var template = await db.StructureTemplates
            .Include(t => t.Layers)
            .SingleOrDefaultAsync(t => t.ChurchId == churchId, ct);
        if (template is not null)
        {
            db.StructureLayers.RemoveRange(template.Layers);
            db.StructureTemplates.Remove(template);
            await db.SaveChangesAsync(ct);
        }

        readCache.InvalidateStructureTree(churchId);
        await tx.CommitAsync(ct);
    }
}
