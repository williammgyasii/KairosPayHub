using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record AttendanceFirstTimerDto(
    Guid Id,
    Guid ScopeNodeId,
    string Name,
    string? Phone,
    string? Notes,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    bool IsFirstTimer,
    string? PriorChurchAttendance);

public record AttendanceCellInviteeDto(
    Guid Id,
    string Name,
    string? Phone,
    string? Notes,
    string? Residence,
    string? OccupationStatus,
    string? SchoolOrWorkplace,
    bool IsFirstTimer,
    string? PriorChurchAttendance,
    bool IsActive,
    Guid? GraduatedMemberId,
    Guid? InvitedByMemberId,
    string? InvitedByMemberName);

public record AttendanceInviteeEntryDto(
    Guid Id,
    Guid ScopeNodeId,
    Guid InviteeId,
    string InviteeName,
    string? InviteePhone,
    string? InviteeResidence,
    string? InviteePriorChurchAttendance,
    string Status,
    bool WasFirstTimer,
    Guid? InvitedByMemberId,
    string? InvitedByMemberName);

public record AttendanceFirstTimerInput(string Name, string? Phone, string? Notes);

public record AttendanceInviteeEntryInput(Guid InviteeId, string Status, bool WasFirstTimer);

public record CreateCellInviteeInput(
    string Name,
    string Phone,
    string? Notes,
    string? Residence,
    MemberOccupationStatus? OccupationStatus,
    string? SchoolOrWorkplace,
    bool IsFirstTimer,
    InviteePriorChurchAttendance? PriorChurchAttendance,
    Guid InvitedByMemberId);

public class AttendanceRollCallExtrasService(KairosDbContext db, AttendanceScopeService scope)
{
    public async Task RefreshOccurrenceWindowAsync(Guid occurrenceId, CancellationToken ct = default)
    {
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId, ct);
        if (occurrence is null)
            return;

        var now = DateTimeOffset.UtcNow;
        var changed = false;

        if (occurrence.Status == AttendanceOccurrenceStatus.Scheduled
            && now >= occurrence.SubmissionOpensAt)
        {
            occurrence.Status = AttendanceOccurrenceStatus.Open;
            changed = true;
        }

        foreach (var submission in occurrence.ScopeSubmissions)
        {
            if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
                && now >= occurrence.SubmissionOpensAt
                && now < occurrence.SubmissionDeadlineAt)
            {
                submission.LockStatus = AttendanceScopeLockStatus.Editable;
                changed = true;
            }
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AttendanceFirstTimerDto>> ListFirstTimersForScopeAsync(
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct = default) =>
        await db.AttendanceFirstTimers.AsNoTracking()
            .Where(row => row.OccurrenceId == occurrenceId && row.ScopeNodeId == scopeNodeId)
            .OrderBy(row => row.Name)
            .Select(row => new AttendanceFirstTimerDto(
                row.Id,
                row.ScopeNodeId,
                row.Name,
                row.Phone,
                row.Notes,
                null,
                null,
                null,
                true,
                null))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<AttendanceInviteeEntryDto>> ListInviteeEntriesForScopeAsync(
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct = default) =>
        await db.AttendanceInviteeEntries.AsNoTracking()
            .Include(row => row.Invitee)
                .ThenInclude(invitee => invitee!.InvitedByMember)
            .Where(row => row.OccurrenceId == occurrenceId && row.ScopeNodeId == scopeNodeId)
            .OrderBy(row => row.Invitee!.Name)
            .Select(row => new AttendanceInviteeEntryDto(
                row.Id,
                row.ScopeNodeId,
                row.InviteeId,
                row.Invitee!.Name,
                row.Invitee.Phone,
                row.Invitee.Residence,
                row.Invitee.PriorChurchAttendance == null
                    ? null
                    : row.Invitee.PriorChurchAttendance.ToString(),
                row.Status.ToString(),
                row.WasFirstTimer,
                row.Invitee.InvitedByMemberId,
                row.Invitee.InvitedByMember == null ? null : row.Invitee.InvitedByMember.Name))
            .ToListAsync(ct);

    public async Task SaveScopeExtrasAsync(
        Guid occurrenceId,
        Guid scopeNodeId,
        IReadOnlyList<AttendanceFirstTimerInput> firstTimers,
        IReadOnlyList<AttendanceInviteeEntryInput> inviteeEntries,
        CancellationToken ct = default)
    {
        var existingFirstTimers = await db.AttendanceFirstTimers
            .Where(row => row.OccurrenceId == occurrenceId && row.ScopeNodeId == scopeNodeId)
            .ToListAsync(ct);
        db.AttendanceFirstTimers.RemoveRange(existingFirstTimers);

        var now = DateTimeOffset.UtcNow;
        foreach (var row in firstTimers)
        {
            if (string.IsNullOrWhiteSpace(row.Name))
                continue;

            db.AttendanceFirstTimers.Add(new AttendanceFirstTimer
            {
                OccurrenceId = occurrenceId,
                ScopeNodeId = scopeNodeId,
                Name = row.Name.Trim(),
                Phone = string.IsNullOrWhiteSpace(row.Phone) ? null : row.Phone.Trim(),
                Notes = string.IsNullOrWhiteSpace(row.Notes) ? null : row.Notes.Trim(),
                CreatedAt = now,
            });
        }

        var inviteeRows = await db.AttendanceInviteeEntries
            .Where(row => row.OccurrenceId == occurrenceId && row.ScopeNodeId == scopeNodeId)
            .ToListAsync(ct);
        var inviteeById = inviteeRows.ToDictionary(row => row.InviteeId);

        foreach (var update in inviteeEntries)
        {
            if (!inviteeById.TryGetValue(update.InviteeId, out var entry))
            {
                entry = new AttendanceInviteeEntry
                {
                    OccurrenceId = occurrenceId,
                    ScopeNodeId = scopeNodeId,
                    InviteeId = update.InviteeId,
                };
                db.AttendanceInviteeEntries.Add(entry);
            }

            entry.Status = ParseEntryStatus(update.Status);
            entry.WasFirstTimer = update.WasFirstTimer;
        }
    }

    public async Task<IReadOnlyList<AttendanceCellInviteeDto>> ListCellInviteesAsync(
        Actor actor,
        Guid authUserId,
        Guid cellScopeNodeId,
        CancellationToken ct = default)
    {
        await EnsureCellScopeAccessAsync(actor, authUserId, cellScopeNodeId, ct);
        return await db.AttendanceCellInvitees.AsNoTracking()
            .Include(row => row.InvitedByMember)
            .Where(row => row.ChurchId == actor.StructureChurchId && row.CellScopeNodeId == cellScopeNodeId)
            .OrderBy(row => row.Name)
            .Select(row => new AttendanceCellInviteeDto(
                row.Id,
                row.Name,
                row.Phone,
                row.Notes,
                row.Residence,
                row.OccupationStatus == null ? null : row.OccupationStatus.ToString(),
                row.SchoolOrWorkplace,
                row.IsFirstTimer,
                row.PriorChurchAttendance == null ? null : row.PriorChurchAttendance.ToString(),
                row.IsActive,
                row.GraduatedMemberId,
                row.InvitedByMemberId,
                row.InvitedByMember == null ? null : row.InvitedByMember.Name))
            .ToListAsync(ct);
    }

    public async Task<AttendanceCellInviteeDto> CreateCellInviteeAsync(
        Actor actor,
        Guid authUserId,
        Guid cellScopeNodeId,
        CreateCellInviteeInput input,
        CancellationToken ct = default)
    {
        await EnsureCellScopeAccessAsync(actor, authUserId, cellScopeNodeId, ct);
        if (string.IsNullOrWhiteSpace(input.Name))
            throw new BadRequestException("Name is required");
        if (string.IsNullOrWhiteSpace(input.Phone))
            throw new BadRequestException("Phone is required");
        if (input.PriorChurchAttendance is null)
            throw new BadRequestException("Previous church attendance is required");
        if (input.InvitedByMemberId == Guid.Empty)
            throw new BadRequestException("Invited by member is required");

        var invitedByMember = await db.ChurchMembers.AsNoTracking()
            .SingleOrDefaultAsync(
                row => row.Id == input.InvitedByMemberId
                    && row.ChurchId == actor.StructureChurchId
                    && row.ParentNodeId == cellScopeNodeId,
                ct)
            ?? throw new BadRequestException("Invited by member must belong to this cell");

        var invitee = new AttendanceCellInvitee
        {
            ChurchId = actor.StructureChurchId,
            CellScopeNodeId = cellScopeNodeId,
            Name = input.Name.Trim(),
            Phone = input.Phone.Trim(),
            Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim(),
            Residence = string.IsNullOrWhiteSpace(input.Residence) ? null : input.Residence.Trim(),
            OccupationStatus = input.OccupationStatus,
            SchoolOrWorkplace = string.IsNullOrWhiteSpace(input.SchoolOrWorkplace)
                ? null
                : input.SchoolOrWorkplace.Trim(),
            IsFirstTimer = input.IsFirstTimer,
            PriorChurchAttendance = input.PriorChurchAttendance,
            InvitedByMemberId = invitedByMember.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.AttendanceCellInvitees.Add(invitee);
        await db.SaveChangesAsync(ct);

        return MapInviteeDto(invitee, invitedByMember.Name);
    }

    public async Task<StructureMemberDto> GraduateInviteeAsync(
        Actor actor,
        Guid authUserId,
        Guid inviteeId,
        CancellationToken ct = default)
    {
        var invitee = await db.AttendanceCellInvitees
            .SingleOrDefaultAsync(row => row.Id == inviteeId && row.ChurchId == actor.StructureChurchId, ct)
            ?? throw new ForbiddenException("Invitee not found");

        await EnsureCellScopeAccessAsync(actor, authUserId, invitee.CellScopeNodeId, ct);
        if (invitee.GraduatedMemberId is not null)
            throw new BadRequestException("Invitee is already registered as a member");

        var member = new Member
        {
            ChurchId = invitee.ChurchId,
            ParentNodeId = invitee.CellScopeNodeId,
            Name = invitee.Name,
            Phone = invitee.Phone,
            Residence = invitee.Residence,
            OccupationStatus = invitee.OccupationStatus,
            SchoolOrWorkplace = invitee.SchoolOrWorkplace,
            Position = MemberPosition.Member,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.ChurchMembers.Add(member);
        invitee.GraduatedMemberId = member.Id;
        invitee.IsActive = false;
        await db.SaveChangesAsync(ct);

        return new StructureMemberDto(
            member.Id,
            member.ParentNodeId,
            member.Name,
            member.Email,
            member.Phone,
            member.Age,
            member.DateOfBirth,
            member.Residence,
            member.OccupationStatus?.ToString(),
            member.SchoolOrWorkplace,
            member.Position.ToString(),
            member.Responsiveness);
    }

    public async Task<IReadOnlyList<AttendanceFirstTimerDto>> ListApprovedFirstTimersAsync(
        Actor actor,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can view first timers");

        return await (
            from entry in db.AttendanceInviteeEntries.AsNoTracking()
            join invitee in db.AttendanceCellInvitees.AsNoTracking() on entry.InviteeId equals invitee.Id
            join occurrence in db.AttendanceOccurrences.AsNoTracking() on entry.OccurrenceId equals occurrence.Id
            join submission in db.AttendanceScopeSubmissions.AsNoTracking()
                on new { entry.OccurrenceId, entry.ScopeNodeId }
                equals new { submission.OccurrenceId, submission.ScopeNodeId }
            where occurrence.ChurchId == actor.StructureChurchId
                && submission.ApprovalStatus == AttendanceScopeApprovalStatus.Approved
                && entry.WasFirstTimer
            orderby invitee.CreatedAt descending
            select new AttendanceFirstTimerDto(
                entry.Id,
                entry.ScopeNodeId,
                invitee.Name,
                invitee.Phone,
                invitee.Notes,
                invitee.Residence,
                invitee.OccupationStatus == null ? null : invitee.OccupationStatus.ToString(),
                invitee.SchoolOrWorkplace,
                invitee.IsFirstTimer,
                invitee.PriorChurchAttendance == null ? null : invitee.PriorChurchAttendance.ToString()))
            .ToListAsync(ct);
    }

    public async Task EnsureInviteeEntryStubsAsync(
        Guid occurrenceId,
        Guid scopeNodeId,
        Guid churchId,
        CancellationToken ct = default)
    {
        var invitees = await db.AttendanceCellInvitees.AsNoTracking()
            .Where(row => row.ChurchId == churchId && row.CellScopeNodeId == scopeNodeId && row.IsActive)
            .Select(row => new { row.Id, row.IsFirstTimer })
            .ToListAsync(ct);

        if (invitees.Count == 0)
            return;

        var inviteeIds = invitees.Select(row => row.Id).ToList();

        var existing = await db.AttendanceInviteeEntries
            .Where(row => row.OccurrenceId == occurrenceId && row.ScopeNodeId == scopeNodeId)
            .Select(row => row.InviteeId)
            .ToListAsync(ct);

        var missing = inviteeIds.Except(existing).ToList();
        if (missing.Count == 0)
            return;

        var firstTimerByInviteeId = invitees.ToDictionary(row => row.Id, row => row.IsFirstTimer);
        foreach (var inviteeId in missing)
        {
            db.AttendanceInviteeEntries.Add(new AttendanceInviteeEntry
            {
                OccurrenceId = occurrenceId,
                ScopeNodeId = scopeNodeId,
                InviteeId = inviteeId,
                WasFirstTimer = firstTimerByInviteeId.GetValueOrDefault(inviteeId),
            });
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task EnsureCellScopeAccessAsync(
        Actor actor,
        Guid authUserId,
        Guid cellScopeNodeId,
        CancellationToken ct)
    {
        if (scope.CanManageChurch(actor))
            return;

        if (!await scope.CanLeadScopeSubmissionAsync(
                actor,
                authUserId,
                new AttendanceScopeSubmission { ScopeNodeId = cellScopeNodeId },
                ct))
        {
            throw new ForbiddenException("You do not have access to this cell");
        }
    }

    private static AttendanceCellInviteeDto MapInviteeDto(AttendanceCellInvitee invitee, string? invitedByMemberName = null) =>
        new(
            invitee.Id,
            invitee.Name,
            invitee.Phone,
            invitee.Notes,
            invitee.Residence,
            invitee.OccupationStatus?.ToString(),
            invitee.SchoolOrWorkplace,
            invitee.IsFirstTimer,
            invitee.PriorChurchAttendance?.ToString(),
            invitee.IsActive,
            invitee.GraduatedMemberId,
            invitee.InvitedByMemberId,
            invitedByMemberName);

    private static AttendanceEntryStatus ParseEntryStatus(string value)
    {
        if (!Enum.TryParse<AttendanceEntryStatus>(value, ignoreCase: true, out var parsed)
            || parsed == AttendanceEntryStatus.Unrecorded)
        {
            throw new BadRequestException("Status must be Present or Absent");
        }

        return parsed;
    }
}
