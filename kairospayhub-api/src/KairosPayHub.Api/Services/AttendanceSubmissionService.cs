using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record AttendanceEntryUpdate(Guid MemberId, string Status);

public record AttendanceEntryDto(
    Guid Id,
    Guid MemberId,
    string MemberName,
    Guid MemberScopeNodeId,
    string Status);

public record AttendanceScopeSubmissionDto(
    Guid Id,
    Guid ScopeNodeId,
    string ScopeUnitName,
    string LockStatus,
    string ApprovalStatus,
    DateTimeOffset? SubmittedAt,
    string? EnteredByRole,
    string? PendingApproverRole);

public record AttendanceApproveResult(
    bool Ok,
    bool IsFinal,
    string ApprovalStatus,
    string? PendingApproverRole);

public record AttendanceApprovalQueueItemDto(
    Guid OccurrenceId,
    Guid ScopeNodeId,
    string CellName,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    DateTimeOffset? SubmittedAt,
    string? SubmittedByName,
    string? EnteredByRole,
    int PresentCount,
    int AbsentCount,
    int MemberCount);

public record AttendanceOccurrenceDetailDto(
    Guid Id,
    Guid MeetingTypeId,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    string Status,
    DateTimeOffset SubmissionOpensAt,
    DateTimeOffset SubmissionDeadlineAt,
    IReadOnlyList<AttendanceScopeSubmissionDto> ScopeSubmissions,
    IReadOnlyList<AttendanceEntryDto> Entries,
    IReadOnlyList<AttendanceFirstTimerDto> FirstTimers,
    IReadOnlyList<AttendanceInviteeEntryDto> InviteeEntries);

public record AttendanceScopeRollCallReviewDto(
    Guid OccurrenceId,
    Guid ScopeNodeId,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    string ApprovalStatus,
    IReadOnlyList<AttendanceEntryDto> Entries,
    IReadOnlyList<AttendanceInviteeEntryDto> InviteeEntries);

public record AttendancePresentPersonDto(
    string Name,
    string PersonKind,
    Guid ScopeNodeId,
    string CellName,
    string? Phone,
    bool WasFirstTimer,
    string? InvitedByMemberName);

public record AttendanceRollupQuery(
    int Page = 1,
    int PageSize = 25,
    string SortBy = "name",
    string SortDir = "asc",
    string? Search = null,
    string? PersonKind = null,
    string? Cell = null);

public record AttendanceOccurrenceRollupDto(
    Guid OccurrenceId,
    string MeetingTypeTitle,
    DateOnly MeetingDate,
    int ApprovedCellCount,
    int PendingCellCount,
    int MembersPresent,
    int MembersAbsent,
    int GuestsPresent,
    int FirstTimersPresent,
    int TotalPresent,
    IReadOnlyList<AttendancePresentPersonDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public class AttendanceSubmissionService(
    KairosDbContext db,
    AttendanceScopeService scope,
    AttendanceRollCallSyncService rollCallSync,
    AttendanceRollCallExtrasService rollCallExtras,
    NotificationService notifications)
{
    public async Task<AttendanceOccurrenceDetailDto> GetOccurrenceAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrenceId, ct);
        await rollCallExtras.RefreshOccurrenceWindowAsync(occurrenceId, ct);

        var occurrence = await db.AttendanceOccurrences.AsNoTracking()
            .Include(o => o.MeetingType)
            .Include(o => o.ScopeSubmissions)
            .Include(o => o.Entries)
            .ThenInclude(e => e.Member)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var visibleScopeIds = await VisibleScopeNodeIdsAsync(actor, authUserId, occurrence, ct);
        foreach (var scopeId in visibleScopeIds)
            await rollCallExtras.EnsureInviteeEntryStubsAsync(occurrenceId, scopeId, churchId, ct);

        var scopeNames = await db.StructureNodes.AsNoTracking()
            .Where(n => visibleScopeIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        var submissions = new List<AttendanceScopeSubmissionDto>();
        foreach (var scopeId in visibleScopeIds)
        {
            var s = occurrence.ScopeSubmissions.FirstOrDefault(row => row.ScopeNodeId == scopeId);
            if (s is null) continue;
            submissions.Add(new AttendanceScopeSubmissionDto(
                s.Id,
                s.ScopeNodeId,
                scopeNames.GetValueOrDefault(s.ScopeNodeId, "Cell"),
                EffectiveLockStatus(s, occurrence),
                s.ApprovalStatus.ToString(),
                s.SubmittedAt,
                s.EnteredByRole?.ToString(),
                await PendingApproverRoleAsync(churchId, s.ApprovalStatus, s.EnteredByRole, ct)));
        }

        var entries = await BuildVisibleEntryDtosAsync(
            churchId,
            occurrence,
            visibleScopeIds,
            ct);

        var firstTimers = new List<AttendanceFirstTimerDto>();
        var inviteeEntries = new List<AttendanceInviteeEntryDto>();
        foreach (var scopeId in visibleScopeIds)
        {
            firstTimers.AddRange(await rollCallExtras.ListFirstTimersForScopeAsync(occurrenceId, scopeId, ct));
            inviteeEntries.AddRange(await rollCallExtras.ListInviteeEntriesForScopeAsync(occurrenceId, scopeId, ct));
        }

        return new AttendanceOccurrenceDetailDto(
            occurrence.Id,
            occurrence.MeetingTypeId,
            occurrence.MeetingType?.Title ?? string.Empty,
            occurrence.MeetingDate,
            occurrence.Status.ToString(),
            occurrence.SubmissionOpensAt,
            occurrence.SubmissionDeadlineAt,
            submissions,
            entries,
            firstTimers,
            inviteeEntries);
    }

    public async Task<AttendanceScopeRollCallReviewDto> GetScopeRollCallReviewAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrenceId, ct);
        await rollCallExtras.RefreshOccurrenceWindowAsync(occurrenceId, ct);
        await rollCallExtras.EnsureInviteeEntryStubsAsync(occurrenceId, scopeNodeId, churchId, ct);

        var occurrence = await db.AttendanceOccurrences.AsNoTracking()
            .Include(o => o.MeetingType)
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var submission = occurrence.ScopeSubmissions
            .SingleOrDefault(s => s.ScopeNodeId == scopeNodeId)
            ?? throw new ForbiddenException("Scope submission not found");

        if (!await scope.CanApproveScopeSubmissionAsync(actor, authUserId, submission, scopeNodeId, ct))
            throw new ForbiddenException("You cannot review this roll call");

        var entries = await EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);
        var entryDtos = entries
            .OrderBy(e => e.Member!.Name)
            .Select(e => new AttendanceEntryDto(
                e.Id,
                e.MemberId,
                e.Member!.Name ?? string.Empty,
                e.MemberScopeNodeId,
                e.Status.ToString()))
            .ToList();

        var inviteeEntries = await rollCallExtras.ListInviteeEntriesForScopeAsync(occurrenceId, scopeNodeId, ct);

        return new AttendanceScopeRollCallReviewDto(
            occurrence.Id,
            scopeNodeId,
            occurrence.MeetingType?.Title ?? string.Empty,
            occurrence.MeetingDate,
            submission.ApprovalStatus.ToString(),
            entryDtos,
            inviteeEntries);
    }

    public async Task<AttendanceOccurrenceRollupDto> GetOccurrenceRollupAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        AttendanceRollupQuery query,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrenceId, ct);

        var occurrence = await db.AttendanceOccurrences.AsNoTracking()
            .Include(o => o.MeetingType)
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var visibleScopeIds = await VisibleScopeNodeIdsAsync(actor, authUserId, occurrence, ct);
        var scopedSubmissions = occurrence.ScopeSubmissions
            .Where(s => visibleScopeIds.Contains(s.ScopeNodeId))
            .ToList();

        var emptyPage = Math.Clamp(query.Page, 1, int.MaxValue);
        var emptyPageSize = Math.Clamp(query.PageSize, 1, 100);

        if (scopedSubmissions.Count == 0)
        {
            return new AttendanceOccurrenceRollupDto(
                occurrence.Id,
                occurrence.MeetingType?.Title ?? string.Empty,
                occurrence.MeetingDate,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                [],
                0,
                emptyPage,
                emptyPageSize);
        }

        var approvedSubmissions = scopedSubmissions
            .Where(s => s.ApprovalStatus == AttendanceScopeApprovalStatus.Approved)
            .ToList();
        var pendingSubmissions = scopedSubmissions
            .Where(s => s.ApprovalStatus == AttendanceScopeApprovalStatus.PendingApproval)
            .ToList();

        var approvablePendingCount = 0;
        foreach (var submission in pendingSubmissions)
        {
            if (await scope.CanApproveScopeSubmissionAsync(
                    actor,
                    authUserId,
                    submission,
                    submission.ScopeNodeId,
                    ct))
            {
                approvablePendingCount++;
            }
        }

        var displaySubmissions = new List<AttendanceScopeSubmission>();
        foreach (var submission in scopedSubmissions)
        {
            if (await scope.IncludeSubmissionInOverviewRollupAsync(actor, submission, ct))
                displaySubmissions.Add(submission);
        }

        var cellNames = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && visibleScopeIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        var presentPeople = new List<AttendancePresentPersonDto>();
        var membersPresent = 0;
        var membersAbsent = 0;
        var guestsPresent = 0;
        var firstTimersPresent = 0;

        foreach (var submission in displaySubmissions)
        {
            var cellName = cellNames.GetValueOrDefault(submission.ScopeNodeId) ?? "Cell";
            var entries = await EntriesInScopeAsync(churchId, occurrenceId, submission.ScopeNodeId, ct);
            foreach (var entry in entries)
            {
                if (entry.Status == AttendanceEntryStatus.Present)
                {
                    membersPresent++;
                    presentPeople.Add(new AttendancePresentPersonDto(
                        entry.Member!.Name ?? "Member",
                        "Member",
                        submission.ScopeNodeId,
                        cellName,
                        entry.Member.Phone,
                        false,
                        null));
                }
                else if (entry.Status == AttendanceEntryStatus.Absent)
                {
                    membersAbsent++;
                }
            }

            var inviteeEntries = await rollCallExtras.ListInviteeEntriesForScopeAsync(
                occurrenceId,
                submission.ScopeNodeId,
                ct);
            foreach (var invitee in inviteeEntries)
            {
                if (invitee.Status != AttendanceEntryStatus.Present.ToString())
                    continue;

                guestsPresent++;
                if (invitee.WasFirstTimer)
                    firstTimersPresent++;

                presentPeople.Add(new AttendancePresentPersonDto(
                    invitee.InviteeName,
                    invitee.WasFirstTimer ? "FirstTimer" : "Invitee",
                    submission.ScopeNodeId,
                    cellName,
                    invitee.InviteePhone,
                    invitee.WasFirstTimer,
                    invitee.InvitedByMemberName));
            }
        }

        var filtered = ApplyRollupFilters(presentPeople, query);
        var sorted = ApplyRollupSort(filtered, query.SortBy, query.SortDir);
        var page = Math.Clamp(query.Page, 1, int.MaxValue);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var totalCount = sorted.Count;
        var pageItems = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new AttendanceOccurrenceRollupDto(
            occurrence.Id,
            occurrence.MeetingType?.Title ?? string.Empty,
            occurrence.MeetingDate,
            approvedSubmissions.Count,
            approvablePendingCount,
            membersPresent,
            membersAbsent,
            guestsPresent,
            firstTimersPresent,
            membersPresent + guestsPresent,
            pageItems,
            totalCount,
            page,
            pageSize);
    }

    private static List<AttendancePresentPersonDto> ApplyRollupFilters(
        IReadOnlyList<AttendancePresentPersonDto> rows,
        AttendanceRollupQuery query)
    {
        IEnumerable<AttendancePresentPersonDto> filtered = rows;

        if (!string.IsNullOrWhiteSpace(query.PersonKind))
        {
            var kind = query.PersonKind.Trim();
            filtered = filtered.Where(row =>
                string.Equals(row.PersonKind, kind, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.Cell))
        {
            var cell = query.Cell.Trim();
            filtered = filtered.Where(row =>
                row.CellName.Contains(cell, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            filtered = filtered.Where(row =>
                row.Name.Contains(search, StringComparison.OrdinalIgnoreCase)
                || (row.Phone?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false)
                || row.CellName.Contains(search, StringComparison.OrdinalIgnoreCase)
                || (row.InvitedByMemberName?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        return filtered.ToList();
    }

    private static List<AttendancePresentPersonDto> ApplyRollupSort(
        IReadOnlyList<AttendancePresentPersonDto> rows,
        string sortBy,
        string sortDir)
    {
        var descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        Func<AttendancePresentPersonDto, object?> keySelector = sortBy.ToLowerInvariant() switch
        {
            "cell" or "cellname" => row => row.CellName,
            "phone" => row => row.Phone ?? string.Empty,
            "type" or "personkind" => row => row.PersonKind,
            "invitedby" or "invitedbymembername" => row => row.InvitedByMemberName ?? string.Empty,
            _ => row => row.Name,
        };

        return descending
            ? rows.OrderByDescending(keySelector).ThenBy(row => row.Name).ToList()
            : rows.OrderBy(keySelector).ThenBy(row => row.Name).ToList();
    }

    public async Task PutEntriesAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        IReadOnlyList<AttendanceEntryUpdate> updates,
        IReadOnlyList<AttendanceFirstTimerInput> firstTimers,
        IReadOnlyList<AttendanceInviteeEntryInput> inviteeEntries,
        bool pastorOverride,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var submission = occurrence.ScopeSubmissions
            .SingleOrDefault(s => s.ScopeNodeId == scopeNodeId)
            ?? throw new ForbiddenException("Scope submission not found");

        if (!await scope.CanEditScopeSubmissionAsync(actor, authUserId, occurrence, submission, pastorOverride, ct))
        {
            if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
                || DateTimeOffset.UtcNow < occurrence.SubmissionOpensAt)
            {
                throw new ForbiddenException("Attendance is not open yet for this occurrence");
            }

            throw new ForbiddenException("Attendance is locked for this scope");
        }

        if (updates.Count == 0 && firstTimers.Count == 0 && inviteeEntries.Count == 0)
            throw new BadRequestException("At least one roll call update is required");

        if (updates.Count > 0)
        {
            var entries = await EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);

            var entryByMember = entries.ToDictionary(e => e.MemberId);
            var now = DateTimeOffset.UtcNow;

            foreach (var update in updates)
            {
                if (!entryByMember.TryGetValue(update.MemberId, out var entry))
                    throw new BadRequestException("Member is not in this scope");

                entry.Status = ParseEntryStatus(update.Status);
                entry.MarkedByAuthUserId = authUserId;
                entry.MarkedAt = now;
            }
        }

        await rollCallExtras.SaveScopeExtrasAsync(
            occurrenceId,
            scopeNodeId,
            firstTimers,
            inviteeEntries,
            ct);

        if (submission.ApprovalStatus == AttendanceScopeApprovalStatus.Rejected)
            submission.ApprovalStatus = AttendanceScopeApprovalStatus.Draft;

        await db.SaveChangesAsync(ct);
    }

    public async Task SubmitAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        bool pastorOverride = false,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .Include(o => o.MeetingType)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var submission = occurrence.ScopeSubmissions
            .SingleOrDefault(s => s.ScopeNodeId == scopeNodeId)
            ?? throw new ForbiddenException("Scope submission not found");

        if (!await scope.CanEditScopeSubmissionAsync(actor, authUserId, occurrence, submission, pastorOverride, ct))
        {
            if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
                || DateTimeOffset.UtcNow < occurrence.SubmissionOpensAt)
            {
                throw new ForbiddenException("Attendance is not open yet for this occurrence");
            }

            throw new ForbiddenException("Attendance is locked for this scope");
        }

        if (submission.ApprovalStatus == AttendanceScopeApprovalStatus.PendingApproval)
            throw new BadRequestException("Roll call is already submitted for approval");

        var entries = await EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);

        if (entries.Count == 0)
            throw new BadRequestException("No members to submit");

        if (entries.Any(e => e.Status == AttendanceEntryStatus.Unrecorded))
            throw new BadRequestException("Mark every member present or absent before submitting");

        submission.ApprovalStatus = AttendanceScopeApprovalStatus.PendingApproval;
        submission.SubmittedAt = DateTimeOffset.UtcNow;
        submission.SubmittedByAuthUserId = authUserId;
        submission.EnteredByRole = actor.StructureRole ?? ChurchRole.CellLeader;

        await db.SaveChangesAsync(ct);

        var cellName = await CellNameAsync(churchId, scopeNodeId, ct);
        await notifications.NotifyAttendancePendingAsync(
            submission,
            occurrence,
            cellName,
            ct);
    }

    public async Task<IReadOnlyList<AttendanceApprovalQueueItemDto>> ListApprovalQueueAsync(
        Actor actor,
        Guid authUserId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var query = db.AttendanceScopeSubmissions.AsNoTracking()
            .Include(s => s.Occurrence!)
            .ThenInclude(o => o.MeetingType)
            .Where(s => s.Occurrence!.ChurchId == churchId);

        query = await scope.ApplyAwaitingMyApprovalFilterAsync(query, churchId, actor, ct);
        var candidates = await query
            .OrderByDescending(s => s.SubmittedAt)
            .ThenByDescending(s => s.Id)
            .ToListAsync(ct);

        if (candidates.Count == 0)
            return [];

        var scopeNodeIds = candidates.Select(s => s.ScopeNodeId).Distinct().ToList();
        var cellNames = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && scopeNodeIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        var submitterIds = candidates
            .Select(s => s.SubmittedByAuthUserId)
            .Where(id => id is not null)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        var submitterNames = submitterIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.ChurchMembers.AsNoTracking()
                .Where(m => m.ChurchId == churchId && m.AuthUserId != null && submitterIds.Contains(m.AuthUserId.Value))
                .ToDictionaryAsync(m => m.AuthUserId!.Value, m => m.Name ?? string.Empty, ct);

        var result = new List<AttendanceApprovalQueueItemDto>();
        foreach (var submission in candidates)
        {
            if (!await scope.CanApproveScopeSubmissionAsync(
                    actor,
                    authUserId,
                    submission,
                    submission.ScopeNodeId,
                    ct))
            {
                continue;
            }

            var counts = await RollCallCountsForScopeAsync(
                churchId,
                submission.OccurrenceId,
                submission.ScopeNodeId,
                ct);

            var occurrence = submission.Occurrence!;
            result.Add(new AttendanceApprovalQueueItemDto(
                submission.OccurrenceId,
                submission.ScopeNodeId,
                cellNames.GetValueOrDefault(submission.ScopeNodeId) ?? "Cell",
                occurrence.MeetingType?.Title ?? string.Empty,
                occurrence.MeetingDate,
                submission.SubmittedAt,
                submission.SubmittedByAuthUserId is Guid submitterId
                    ? submitterNames.GetValueOrDefault(submitterId)
                    : null,
                submission.EnteredByRole?.ToString(),
                counts.Present,
                counts.Absent,
                counts.Total));
        }

        return result;
    }

    public async Task<AttendanceApproveResult> ApproveAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var submission = await LoadScopeSubmissionAsync(churchId, occurrenceId, scopeNodeId, ct);

        if (!await scope.CanApproveScopeSubmissionAsync(actor, authUserId, submission, scopeNodeId, ct))
            throw new ForbiddenException("You cannot approve this roll call");

        if (submission.ApprovalStatus != AttendanceScopeApprovalStatus.PendingApproval)
            throw new BadRequestException("Roll call is not pending approval");

        var approverRole = actor.StructureRole
            ?? throw new BadRequestException("Your account is not linked to a structure role");

        submission.EnteredByRole = approverRole;
        submission.RejectionReason = null;
        submission.RejectedByAuthUserId = null;
        submission.RejectedAt = null;
        submission.ApprovalStatus = AttendanceScopeApprovalStatus.Approved;
        submission.ApprovedByAuthUserId = authUserId;
        submission.ApprovedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        var cellName = await CellNameAsync(churchId, scopeNodeId, ct);
        var occurrence = submission.Occurrence
            ?? throw new InvalidOperationException("Occurrence not loaded");

        await notifications.NotifyAttendanceReviewedAsync(
            submission,
            occurrence,
            cellName,
            approved: true,
            ct);

        return new AttendanceApproveResult(
            Ok: true,
            IsFinal: true,
            ApprovalStatus: submission.ApprovalStatus.ToString(),
            PendingApproverRole: null);
    }

    public async Task RejectAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        string? reason,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var submission = await LoadScopeSubmissionAsync(churchId, occurrenceId, scopeNodeId, ct);

        if (!await scope.CanApproveScopeSubmissionAsync(actor, authUserId, submission, scopeNodeId, ct))
            throw new ForbiddenException("You cannot reject this roll call");

        if (submission.ApprovalStatus != AttendanceScopeApprovalStatus.PendingApproval)
            throw new BadRequestException("Roll call is not pending approval");

        submission.ApprovalStatus = AttendanceScopeApprovalStatus.Rejected;
        submission.RejectedByAuthUserId = authUserId;
        submission.RejectedAt = DateTimeOffset.UtcNow;
        submission.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        submission.ApprovedByAuthUserId = null;
        submission.ApprovedAt = null;

        await db.SaveChangesAsync(ct);

        var cellName = await CellNameAsync(churchId, scopeNodeId, ct);
        var occurrence = submission.Occurrence
            ?? throw new InvalidOperationException("Occurrence not loaded");
        await notifications.NotifyAttendanceReviewedAsync(
            submission,
            occurrence,
            cellName,
            approved: false,
            ct);
    }

    private async Task<AttendanceScopeSubmission> LoadScopeSubmissionAsync(
        Guid churchId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        return await db.AttendanceScopeSubmissions
            .Include(s => s.Occurrence!)
            .ThenInclude(o => o.MeetingType)
            .SingleOrDefaultAsync(
                s => s.OccurrenceId == occurrenceId
                    && s.ScopeNodeId == scopeNodeId
                    && s.Occurrence!.ChurchId == churchId,
                ct)
            ?? throw new ForbiddenException("Scope submission not found");
    }

    private async Task<(int Present, int Absent, int Total)> RollCallCountsForScopeAsync(
        Guid churchId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        var entries = await EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);
        var present = entries.Count(e => e.Status == AttendanceEntryStatus.Present);
        var absent = entries.Count(e => e.Status == AttendanceEntryStatus.Absent);
        return (present, absent, entries.Count);
    }

    private async Task<HashSet<Guid>> VisibleScopeNodeIdsAsync(
        Actor actor,
        Guid authUserId,
        AttendanceOccurrence occurrence,
        CancellationToken ct)
    {
        if (scope.CanManageChurch(actor))
            return occurrence.ScopeSubmissions.Select(s => s.ScopeNodeId).ToHashSet();

        var visible = new HashSet<Guid>();

        if (actor.StructureRole is ChurchRole approverRole
            && approverRole is ChurchRole.FellowshipLeader or ChurchRole.PFCCManager)
        {
            var assignmentScopeIds = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.Role == approverRole
                    && r.ScopeNodeId != null)
                .Select(r => r.ScopeNodeId!.Value)
                .ToListAsync(ct);

            foreach (var assignmentScopeId in assignmentScopeIds)
            {
                foreach (var submission in occurrence.ScopeSubmissions)
                {
                    if (await scope.IsNodeInSubtreeAsync(
                            actor.StructureChurchId,
                            assignmentScopeId,
                            submission.ScopeNodeId,
                            ct))
                    {
                        visible.Add(submission.ScopeNodeId);
                    }
                }
            }
        }

        var cellLeaderScopeIds = await db.RoleAssignments.AsNoTracking()
            .Where(r =>
                r.ChurchId == actor.StructureChurchId
                && r.AuthUserId == authUserId
                && r.Role == ChurchRole.CellLeader
                && r.ScopeNodeId != null)
            .Select(r => r.ScopeNodeId!.Value)
            .ToListAsync(ct);

        foreach (var cellScopeId in cellLeaderScopeIds)
            visible.Add(cellScopeId);

        foreach (var submission in occurrence.ScopeSubmissions)
        {
            if (submission.AssignedLeaderAuthUserId == authUserId)
                visible.Add(submission.ScopeNodeId);
        }

        return visible;
    }

    private static string EffectiveLockStatus(
        AttendanceScopeSubmission submission,
        AttendanceOccurrence occurrence)
    {
        if (submission.ApprovalStatus is AttendanceScopeApprovalStatus.Draft
            or AttendanceScopeApprovalStatus.Rejected)
        {
            return AttendanceScopeLockStatus.Editable.ToString();
        }

        var now = DateTimeOffset.UtcNow;
        if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
            && now >= occurrence.SubmissionOpensAt
            && now < occurrence.SubmissionDeadlineAt)
        {
            return AttendanceScopeLockStatus.Editable.ToString();
        }

        return submission.LockStatus.ToString();
    }

    private async Task<List<AttendanceEntry>> EntriesInScopeAsync(
        Guid churchId,
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        var subtreeIds = (await scope.CollectSubtreeNodeIdsAsync(churchId, scopeNodeId, ct)).ToHashSet();
        var entries = await db.AttendanceEntries
            .Include(e => e.Member)
            .Where(e => e.OccurrenceId == occurrenceId)
            .ToListAsync(ct);

        return entries
            .Where(e => e.Member is not null && subtreeIds.Contains(e.Member.ParentNodeId))
            .ToList();
    }

    private async Task<List<AttendanceEntryDto>> BuildVisibleEntryDtosAsync(
        Guid churchId,
        AttendanceOccurrence occurrence,
        HashSet<Guid> visibleScopeIds,
        CancellationToken ct)
    {
        var result = new List<AttendanceEntryDto>();
        var seenMembers = new HashSet<Guid>();

        foreach (var scopeId in visibleScopeIds.OrderBy(id => id))
        {
            var subtreeIds = (await scope.CollectSubtreeNodeIdsAsync(churchId, scopeId, ct)).ToHashSet();
            foreach (var entry in occurrence.Entries)
            {
                if (entry.Member is null || !subtreeIds.Contains(entry.Member.ParentNodeId))
                    continue;

                if (!seenMembers.Add(entry.MemberId))
                    continue;

                result.Add(new AttendanceEntryDto(
                    entry.Id,
                    entry.MemberId,
                    entry.Member.Name ?? string.Empty,
                    entry.MemberScopeNodeId,
                    entry.Status.ToString()));
            }
        }

        return result;
    }

    private static AttendanceEntryStatus ParseEntryStatus(string value)
    {
        if (!Enum.TryParse<AttendanceEntryStatus>(value, ignoreCase: true, out var parsed)
            || parsed == AttendanceEntryStatus.Unrecorded)
        {
            throw new BadRequestException("Status must be Present or Absent");
        }

        return parsed;
    }

    private async Task<string?> PendingApproverRoleAsync(
        Guid churchId,
        AttendanceScopeApprovalStatus status,
        ChurchRole? enteredByRole,
        CancellationToken ct)
    {
        if (status != AttendanceScopeApprovalStatus.PendingApproval)
            return null;

        var role = await scope.ResolveApprovingRoleAsync(churchId, enteredByRole, ct);
        return role?.ToString();
    }

    private async Task<string> CellNameAsync(Guid churchId, Guid scopeNodeId, CancellationToken ct) =>
        await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && n.Id == scopeNodeId)
            .Select(n => n.Name)
            .FirstOrDefaultAsync(ct) ?? "Cell";

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }
}
