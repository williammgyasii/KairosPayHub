using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class AttendanceMemberHistoryService(KairosDbContext db, GivingScopeService givingScope)
{
    public async Task<MemberAttendanceHistoryResponse> GetHistoryAsync(
        Actor actor,
        Guid authUserId,
        Guid memberId,
        int page,
        int pageSize,
        Guid? meetingTypeId = null,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await givingScope.CanAccessStructureReadAsync(actor, authUserId, ct);

        var member = await db.ChurchMembers.AsNoTracking()
            .SingleOrDefaultAsync(m => m.Id == memberId && m.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Member not found");

        if (!givingScope.CanManageChurch(actor))
        {
            var visibleNodeIds = await givingScope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
            if (!visibleNodeIds.Contains(member.ParentNodeId))
                throw new ForbiddenException("Member not found");
        }

        if (meetingTypeId is Guid filterTypeId)
        {
            var typeExists = await db.AttendanceMeetingTypes.AsNoTracking()
                .AnyAsync(t => t.Id == filterTypeId && t.ChurchId == churchId, ct);
            if (!typeExists)
                throw new ForbiddenException("Meeting type not found");
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var recordedQuery = db.AttendanceEntries.AsNoTracking()
            .Where(e => e.MemberId == memberId
                && e.Occurrence != null
                && e.Occurrence.ChurchId == churchId
                && e.Status != AttendanceEntryStatus.Unrecorded);

        var meetingTypeRows = await db.AttendanceMeetingTypes.AsNoTracking()
            .Where(t => t.ChurchId == churchId && t.IsActive)
            .OrderBy(t => t.Title)
            .Select(t => new { t.Id, t.Title })
            .ToListAsync(ct);

        var countRows = await recordedQuery
            .GroupBy(e => e.Occurrence!.MeetingTypeId)
            .Select(g => new
            {
                MeetingTypeId = g.Key,
                PresentCount = g.Count(e => e.Status == AttendanceEntryStatus.Present),
                AbsentCount = g.Count(e => e.Status == AttendanceEntryStatus.Absent),
            })
            .ToListAsync(ct);
        var countsByType = countRows.ToDictionary(r => r.MeetingTypeId);

        var meetingTypes = meetingTypeRows
            .Select(t =>
            {
                countsByType.TryGetValue(t.Id, out var counts);
                var present = counts?.PresentCount ?? 0;
                var absent = counts?.AbsentCount ?? 0;
                return new MemberAttendanceMeetingTypeSummaryDto(
                    t.Id,
                    t.Title,
                    present,
                    absent,
                    present + absent);
            })
            .ToList();

        var filteredQuery = meetingTypeId is Guid selectedTypeId
            ? recordedQuery.Where(e => e.Occurrence!.MeetingTypeId == selectedTypeId)
            : recordedQuery;

        var presentCount = await filteredQuery.CountAsync(e => e.Status == AttendanceEntryStatus.Present, ct);
        var absentCount = await filteredQuery.CountAsync(e => e.Status == AttendanceEntryStatus.Absent, ct);
        var recordedCount = presentCount + absentCount;
        var totalCount = recordedCount;

        var rows = await filteredQuery
            .OrderByDescending(e => e.Occurrence!.MeetingDate)
            .ThenByDescending(e => e.MarkedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id,
                e.OccurrenceId,
                MeetingDate = e.Occurrence!.MeetingDate,
                MeetingTypeId = e.Occurrence.MeetingTypeId,
                MeetingTypeTitle = e.Occurrence.MeetingType != null
                    ? e.Occurrence.MeetingType.Title
                    : "Meeting",
                Status = e.Status.ToString(),
                e.MemberScopeNodeId,
            })
            .ToListAsync(ct);

        var scopeIds = rows.Select(r => r.MemberScopeNodeId).Distinct().ToList();
        var scopeNames = await db.StructureNodes.AsNoTracking()
            .Where(n => scopeIds.Contains(n.Id) && n.ChurchId == churchId)
            .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        var items = rows
            .Select(r => new MemberAttendanceHistoryItemDto(
                r.Id,
                r.OccurrenceId,
                r.MeetingDate,
                r.MeetingTypeId,
                r.MeetingTypeTitle,
                r.Status,
                r.MemberScopeNodeId,
                scopeNames.GetValueOrDefault(r.MemberScopeNodeId)))
            .ToList();

        return new MemberAttendanceHistoryResponse(
            items,
            new MemberAttendanceHistorySummaryDto(presentCount, absentCount, recordedCount),
            meetingTypes,
            meetingTypeId,
            totalCount,
            page,
            pageSize);
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }
}
