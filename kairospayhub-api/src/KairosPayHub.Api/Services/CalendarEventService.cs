using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Events;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record CalendarEventDto(
    string Id,
    string Kind,
    string Title,
    string? Detail,
    DateOnly Date,
    Guid? ScopeNodeId,
    string? ScopeUnitName,
    bool CanEdit);

public record CreateCalendarEventInput(
    string Title,
    string? Description,
    DateOnly EventDate,
    Guid? ScopeNodeId);

public class CalendarEventService(KairosDbContext db, GivingScopeService givingScope, NotificationService notifications)
{
    public async Task<IReadOnlyList<CalendarEventDto>> GetFeedAsync(
        Actor actor,
        Guid authUserId,
        DateOnly from,
        DateOnly to,
        CancellationToken ct = default)
    {
        if (to < from)
            throw new BadRequestException("'to' must be on or after 'from'");

        var churchId = actor.StructureChurchId;
        await givingScope.CanAccessStructureReadAsync(actor, authUserId, ct);

        var churchWideViewer = givingScope.CanManageChurch(actor);
        var viewerRoots = await GetViewerScopeRootsAsync(actor, authUserId, ct);

        var items = new List<CalendarEventDto>();
        items.AddRange(await GetBirthdayEventsAsync(
            churchId,
            actor,
            authUserId,
            churchWideViewer,
            from,
            to,
            ct));
        items.AddRange(await GetMeetingEventsAsync(
            churchId,
            viewerRoots,
            churchWideViewer,
            from,
            to,
            ct));
        items.AddRange(await GetCustomEventsAsync(
            actor,
            authUserId,
            churchId,
            viewerRoots,
            churchWideViewer,
            from,
            to,
            ct));

        return items
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Kind)
            .ThenBy(e => e.Title)
            .ToList();
    }

    public async Task<CalendarEventDto> CreateAsync(
        Actor actor,
        Guid authUserId,
        CreateCalendarEventInput input,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(input.Title))
            throw new BadRequestException("Title is required");

        var churchId = actor.StructureChurchId;
        await givingScope.CanAccessStructureReadAsync(actor, authUserId, ct);
        await ValidateScopeForCreateAsync(actor, authUserId, input.ScopeNodeId, ct);

        var entity = new ChurchCalendarEvent
        {
            ChurchId = churchId,
            ScopeNodeId = input.ScopeNodeId,
            Title = input.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim(),
            EventDate = input.EventDate,
            CreatedByAuthUserId = authUserId,
        };

        db.ChurchCalendarEvents.Add(entity);
        await db.SaveChangesAsync(ct);

        await notifications.NotifyCalendarEventCreatedAsync(
            churchId,
            entity.ScopeNodeId,
            entity.Title,
            entity.Description,
            entity.EventDate,
            authUserId,
            entity.Id,
            ct);

        return await MapCustomEventAsync(entity, actor, authUserId, ct);
    }

    public async Task DeleteAsync(
        Actor actor,
        Guid authUserId,
        Guid eventId,
        CancellationToken ct = default)
    {
        var entity = await db.ChurchCalendarEvents
            .SingleOrDefaultAsync(e => e.Id == eventId && e.ChurchId == actor.StructureChurchId, ct)
            ?? throw new BadRequestException("Event not found");

        if (!await CanManageCustomEventAsync(actor, authUserId, entity, ct))
            throw new ForbiddenException("You cannot delete this event");

        db.ChurchCalendarEvents.Remove(entity);
        await db.SaveChangesAsync(ct);
    }

    private async Task<List<CalendarEventDto>> GetBirthdayEventsAsync(
        Guid churchId,
        Actor actor,
        Guid authUserId,
        bool churchWideViewer,
        DateOnly from,
        DateOnly to,
        CancellationToken ct)
    {
        HashSet<Guid> memberNodeIds;
        if (churchWideViewer)
        {
            memberNodeIds = await db.ChurchMembers.AsNoTracking()
                .Where(m => m.ChurchId == churchId)
                .Select(m => m.ParentNodeId)
                .ToHashSetAsync(ct);
        }
        else
        {
            memberNodeIds = await givingScope.GetActorVisibleMemberNodeIdsAsync(actor, authUserId, ct);
        }

        if (memberNodeIds.Count == 0)
            return [];

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId && memberNodeIds.Contains(m.ParentNodeId) && m.DateOfBirth != null)
            .Select(m => new { m.Id, m.Name, m.DateOfBirth })
            .ToListAsync(ct);

        var results = new List<CalendarEventDto>();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            foreach (var member in members)
            {
                var dob = member.DateOfBirth!.Value;
                if (dob.Month != date.Month || dob.Day != date.Day)
                    continue;

                var turningAge = AgeOnDate(dob, date);
                results.Add(new CalendarEventDto(
                    $"birthday-{member.Id}-{date:yyyy-MM-dd}",
                    "Birthday",
                    member.Name,
                    turningAge is not null ? $"Turns {turningAge}" : "Birthday",
                    date,
                    null,
                    null,
                    false));
            }
        }

        return results;
    }

    private async Task<List<CalendarEventDto>> GetMeetingEventsAsync(
        Guid churchId,
        IReadOnlyList<Guid> viewerRoots,
        bool churchWideViewer,
        DateOnly from,
        DateOnly to,
        CancellationToken ct)
    {
        var occurrences = await db.AttendanceOccurrences.AsNoTracking()
            .Include(o => o.MeetingType!)
            .ThenInclude(t => t!.ScopeNodes)
            .Where(o =>
                o.ChurchId == churchId
                && o.MeetingDate >= from
                && o.MeetingDate <= to
                && o.MeetingType!.IsActive)
            .ToListAsync(ct);

        var results = new List<CalendarEventDto>();
        foreach (var occurrence in occurrences)
        {
            if (!await IsMeetingVisibleAsync(
                occurrence.MeetingType!,
                churchId,
                viewerRoots,
                churchWideViewer,
                ct))
            {
                continue;
            }

            results.Add(new CalendarEventDto(
                $"meeting-{occurrence.Id}",
                "Meeting",
                occurrence.MeetingType!.Title,
                "Roll call",
                occurrence.MeetingDate,
                occurrence.MeetingType.ScopeNodeId,
                null,
                false));
        }

        return results;
    }

    private async Task<List<CalendarEventDto>> GetCustomEventsAsync(
        Actor actor,
        Guid authUserId,
        Guid churchId,
        IReadOnlyList<Guid> viewerRoots,
        bool churchWideViewer,
        DateOnly from,
        DateOnly to,
        CancellationToken ct)
    {
        var events = await db.ChurchCalendarEvents.AsNoTracking()
            .Where(e => e.ChurchId == churchId && e.EventDate >= from && e.EventDate <= to)
            .ToListAsync(ct);

        var results = new List<CalendarEventDto>();
        foreach (var entity in events)
        {
            if (!await IsScopeVisibleAsync(churchId, entity.ScopeNodeId, viewerRoots, churchWideViewer, ct))
                continue;

            results.Add(await MapCustomEventAsync(entity, actor, authUserId, ct));
        }

        return results;
    }

    private async Task<CalendarEventDto> MapCustomEventAsync(
        ChurchCalendarEvent entity,
        Actor actor,
        Guid authUserId,
        CancellationToken ct)
    {
        string? scopeUnitName = null;
        if (entity.ScopeNodeId is Guid scopeNodeId)
        {
            scopeUnitName = await db.StructureNodes.AsNoTracking()
                .Where(n => n.Id == scopeNodeId && n.ChurchId == entity.ChurchId)
                .Select(n => n.Name)
                .FirstOrDefaultAsync(ct);
        }
        else
        {
            scopeUnitName = "Church-wide";
        }

        return new CalendarEventDto(
            entity.Id.ToString(),
            "Custom",
            entity.Title,
            entity.Description,
            entity.EventDate,
            entity.ScopeNodeId,
            scopeUnitName,
            await CanManageCustomEventAsync(actor, authUserId, entity, ct));
    }

    private async Task<bool> IsMeetingVisibleAsync(
        AttendanceMeetingType meetingType,
        Guid churchId,
        IReadOnlyList<Guid> viewerRoots,
        bool churchWideViewer,
        CancellationToken ct)
    {
        if (churchWideViewer)
            return true;

        if (meetingType.ScopeKind == ProgramScopeKind.ChurchWide)
            return true;

        var meetingScopeRoots = await ResolveMeetingScopeRootsAsync(meetingType, churchId, ct);
        foreach (var meetingRoot in meetingScopeRoots)
        {
            if (await ScopeOverlapsViewerAsync(churchId, meetingRoot, viewerRoots, ct))
                return true;
        }

        return false;
    }

    private async Task<List<Guid>> ResolveMeetingScopeRootsAsync(
        AttendanceMeetingType meetingType,
        Guid churchId,
        CancellationToken ct)
    {
        if (meetingType.ScopeKind == ProgramScopeKind.FellowshipGroup)
        {
            return await db.AttendanceMeetingTypeScopeNodes.AsNoTracking()
                .Where(s => s.MeetingTypeId == meetingType.Id)
                .Select(s => s.StructureNodeId)
                .ToListAsync(ct);
        }

        if (meetingType.ScopeNodeId is Guid scopeNodeId)
            return [scopeNodeId];

        return [];
    }

    private async Task<bool> IsScopeVisibleAsync(
        Guid churchId,
        Guid? eventScopeNodeId,
        IReadOnlyList<Guid> viewerRoots,
        bool churchWideViewer,
        CancellationToken ct)
    {
        if (churchWideViewer)
            return true;

        if (eventScopeNodeId is null)
            return true;

        return await ScopeOverlapsViewerAsync(churchId, eventScopeNodeId.Value, viewerRoots, ct);
    }

    private async Task<bool> ScopeOverlapsViewerAsync(
        Guid churchId,
        Guid eventScopeNodeId,
        IReadOnlyList<Guid> viewerRoots,
        CancellationToken ct)
    {
        foreach (var viewerRoot in viewerRoots)
        {
            if (eventScopeNodeId == viewerRoot)
                return true;

            if (await givingScope.IsNodeInSubtreeAsync(churchId, viewerRoot, eventScopeNodeId, ct))
                return true;

            if (await givingScope.IsNodeInSubtreeAsync(churchId, eventScopeNodeId, viewerRoot, ct))
                return true;
        }

        return false;
    }

    private async Task<List<Guid>> GetViewerScopeRootsAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct)
    {
        if (givingScope.CanManageChurch(actor))
            return [];

        var assignments = await db.RoleAssignments.AsNoTracking()
            .Where(r => r.ChurchId == actor.StructureChurchId && r.AuthUserId == authUserId)
            .ToListAsync(ct);

        var roots = new HashSet<Guid>();
        foreach (var assignment in assignments)
        {
            if (assignment.ScopeNodeId is not Guid scopeNodeId)
                continue;

            if (assignment.Role is not (
                ChurchRole.PFCCManager
                or ChurchRole.FellowshipLeader
                or ChurchRole.CellLeader))
            {
                continue;
            }

            roots.Add(scopeNodeId);
        }

        return roots.ToList();
    }

    private async Task ValidateScopeForCreateAsync(
        Actor actor,
        Guid authUserId,
        Guid? scopeNodeId,
        CancellationToken ct)
    {
        if (scopeNodeId is null)
        {
            if (!givingScope.CanManageChurch(actor))
                throw new ForbiddenException("Only church managers can create church-wide events");
            return;
        }

        var exists = await db.StructureNodes.AsNoTracking()
            .AnyAsync(n => n.Id == scopeNodeId && n.ChurchId == actor.StructureChurchId, ct);
        if (!exists)
            throw new BadRequestException("Scope node not found");

        if (givingScope.CanManageChurch(actor))
            return;

        if (!await givingScope.IsNodeAccessibleViaAssignmentsAsync(
            actor.StructureChurchId,
            authUserId,
            scopeNodeId.Value,
            ct))
        {
            throw new ForbiddenException("You cannot create events outside your scope");
        }

        if (actor.StructureRole == ChurchRole.CellLeader)
        {
            var cellScopes = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.Role == ChurchRole.CellLeader
                    && r.ScopeNodeId != null)
                .Select(r => r.ScopeNodeId!.Value)
                .ToListAsync(ct);

            if (!cellScopes.Contains(scopeNodeId.Value))
                throw new ForbiddenException("Cell leaders can only create events for their cell");
        }
    }

    private async Task<bool> CanManageCustomEventAsync(
        Actor actor,
        Guid authUserId,
        ChurchCalendarEvent entity,
        CancellationToken ct)
    {
        if (givingScope.CanManageChurch(actor))
            return true;

        if (entity.CreatedByAuthUserId == authUserId)
            return true;

        if (entity.ScopeNodeId is not Guid scopeNodeId)
            return false;

        return await givingScope.IsNodeAccessibleViaAssignmentsAsync(
            actor.StructureChurchId,
            authUserId,
            scopeNodeId,
            ct);
    }

    private static int? AgeOnDate(DateOnly dateOfBirth, DateOnly onDate)
    {
        var age = onDate.Year - dateOfBirth.Year;
        if (onDate < dateOfBirth.AddYears(age))
            age -= 1;

        return age >= 0 ? age + 1 : null;
    }
}
