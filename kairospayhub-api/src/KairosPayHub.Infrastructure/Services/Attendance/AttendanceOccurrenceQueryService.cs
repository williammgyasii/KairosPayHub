using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class AttendanceOccurrenceQueryService(
    KairosDbContext db,
    AttendanceScopeService scope,
    AttendanceRollCallSyncService rollCallSync,
    AttendanceRollCallExtrasService rollCallExtras,
    AttendanceSubmissionSupport support)
{
    public async Task<AttendanceOccurrenceDetailDto> GetOccurrenceAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrenceId, ct);
        await rollCallExtras.RefreshOccurrenceWindowAsync(occurrenceId, ct);

        var occurrence = await db.AttendanceOccurrences.AsNoTracking()
            .Include(o => o.MeetingType)
            .Include(o => o.ScopeSubmissions)
            .Include(o => o.Entries)
            .ThenInclude(e => e.Member)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var visibleScopeIds = await support.VisibleScopeNodeIdsAsync(actor, authUserId, occurrence, ct);
        foreach (var scopeId in visibleScopeIds)
            await rollCallExtras.EnsureInviteeEntryStubsAsync(occurrenceId, scopeId, churchId, ct);

        var scopeNodes = await db.StructureNodes.AsNoTracking()
            .Where(n => visibleScopeIds.Contains(n.Id))
            .Select(n => new
            {
                n.Id,
                n.Name,
                n.ParentNodeId,
                LayerName = n.Layer != null ? n.Layer.DisplayName : null,
            })
            .ToListAsync(ct);
        var scopeNames = scopeNodes.ToDictionary(n => n.Id, n => n.Name);
        var scopeLayerNames = scopeNodes.ToDictionary(n => n.Id, n => n.LayerName);
        var parentIds = scopeNodes
            .Where(n => n.ParentNodeId is not null)
            .Select(n => n.ParentNodeId!.Value)
            .Distinct()
            .ToList();
        var parentNodes = parentIds.Count == 0
            ? []
            : await db.StructureNodes.AsNoTracking()
                .Where(n => parentIds.Contains(n.Id))
                .Select(n => new
                {
                    n.Id,
                    n.Name,
                    LayerName = n.Layer != null ? n.Layer.DisplayName : null,
                })
                .ToListAsync(ct);
        var parentNames = parentNodes.ToDictionary(n => n.Id, n => n.Name);
        var parentLayerNames = parentNodes.ToDictionary(n => n.Id, n => n.LayerName);

        var submissions = new List<AttendanceScopeSubmissionDto>();
        foreach (var scopeId in visibleScopeIds)
        {
            var s = occurrence.ScopeSubmissions.FirstOrDefault(row => row.ScopeNodeId == scopeId);
            if (s is null) continue;
            var parentId = scopeNodes.FirstOrDefault(n => n.Id == scopeId)?.ParentNodeId;

            var scopeEntries = await support.EntriesInScopeAsync(churchId, occurrenceId, scopeId, ct);
            var membersPresent = scopeEntries.Count(e => e.Status == AttendanceEntryStatus.Present);
            var membersAbsent = scopeEntries.Count(e => e.Status == AttendanceEntryStatus.Absent);
            var scopeInvitees = await rollCallExtras.ListInviteeEntriesForScopeAsync(
                occurrenceId,
                scopeId,
                ct);
            var presentInvitees = scopeInvitees
                .Where(i => i.Status == AttendanceEntryStatus.Present.ToString())
                .ToList();
            var guestsPresent = presentInvitees.Count;
            var firstTimersPresent = presentInvitees.Count(i => i.WasFirstTimer);

            submissions.Add(new AttendanceScopeSubmissionDto(
                s.Id,
                s.ScopeNodeId,
                scopeNames.GetValueOrDefault(s.ScopeNodeId, "Cell"),
                parentId is Guid pid ? parentNames.GetValueOrDefault(pid) : null,
                parentId is Guid parentKey ? parentLayerNames.GetValueOrDefault(parentKey) : null,
                scopeLayerNames.GetValueOrDefault(s.ScopeNodeId),
                AttendanceSubmissionSupport.EffectiveLockStatus(s, occurrence),
                s.ApprovalStatus.ToString(),
                s.SubmittedAt,
                s.EnteredByRole?.ToString(),
                await support.PendingApproverRoleAsync(churchId, s.ApprovalStatus, s.EnteredByRole, ct),
                membersPresent,
                membersAbsent,
                guestsPresent,
                firstTimersPresent,
                membersPresent + guestsPresent));
        }

        var entries = await support.BuildVisibleEntryDtosAsync(
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
        var churchId = support.RequireStructureChurch(actor);
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

        var entries = await support.EntriesInScopeAsync(churchId, occurrenceId, scopeNodeId, ct);
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
        var churchId = support.RequireStructureChurch(actor);
        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrenceId, ct);

        var occurrence = await db.AttendanceOccurrences.AsNoTracking()
            .Include(o => o.MeetingType)
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var visibleScopeIds = await support.VisibleScopeNodeIdsAsync(actor, authUserId, occurrence, ct);
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

        var scopeNodes = await db.StructureNodes.AsNoTracking()
            .Where(n => n.ChurchId == churchId && visibleScopeIds.Contains(n.Id))
            .Select(n => new { n.Id, n.Name, n.ParentNodeId })
            .ToListAsync(ct);
        var cellNames = scopeNodes.ToDictionary(n => n.Id, n => n.Name);
        var parentIds = scopeNodes
            .Where(n => n.ParentNodeId is not null)
            .Select(n => n.ParentNodeId!.Value)
            .Distinct()
            .ToList();
        var parentNames = parentIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.StructureNodes.AsNoTracking()
                .Where(n => parentIds.Contains(n.Id))
                .ToDictionaryAsync(n => n.Id, n => n.Name, ct);

        var presentPeople = new List<AttendancePresentPersonDto>();
        var membersPresent = 0;
        var membersAbsent = 0;
        var guestsPresent = 0;
        var firstTimersPresent = 0;

        foreach (var submission in displaySubmissions)
        {
            var cellName = cellNames.GetValueOrDefault(submission.ScopeNodeId) ?? "Cell";
            var parentId = scopeNodes.FirstOrDefault(n => n.Id == submission.ScopeNodeId)?.ParentNodeId;
            var parentUnitName = parentId is Guid pid ? parentNames.GetValueOrDefault(pid) : null;
            var entries = await support.EntriesInScopeAsync(churchId, occurrenceId, submission.ScopeNodeId, ct);
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
                        parentUnitName,
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
                    parentUnitName,
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
                || (row.ParentUnitName?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false)
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
            "parent" or "parentunit" or "parentunitname" => row => row.ParentUnitName ?? string.Empty,
            "phone" => row => row.Phone ?? string.Empty,
            "type" or "personkind" => row => row.PersonKind,
            "invitedby" or "invitedbymembername" => row => row.InvitedByMemberName ?? string.Empty,
            _ => row => row.Name,
        };

        return descending
            ? rows.OrderByDescending(keySelector).ThenBy(row => row.Name).ToList()
            : rows.OrderBy(keySelector).ThenBy(row => row.Name).ToList();
    }
}
