using System.Text.Json;
using KairosPayHub.Api.Attendance;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Scores guest-risk on submit and reads stored reasons for approvals.
/// </summary>
public class GuestRiskService(KairosDbContext db)
{
    public async Task ApplyOnSubmitAsync(Guid occurrenceId, Guid scopeNodeId, CancellationToken ct = default)
    {
        var submission = await db.AttendanceScopeSubmissions
            .SingleAsync(s => s.OccurrenceId == occurrenceId && s.ScopeNodeId == scopeNodeId, ct);

        var presentMembers = await db.AttendanceEntries
            .CountAsync(
                e => e.OccurrenceId == occurrenceId
                    && e.MemberScopeNodeId == scopeNodeId
                    && e.Status == AttendanceEntryStatus.Present,
                ct);

        var invitees = await db.AttendanceInviteeEntries
            .AsNoTracking()
            .Where(e => e.OccurrenceId == occurrenceId && e.ScopeNodeId == scopeNodeId)
            .Select(e => new GuestRiskInvitee(
                e.Invitee!.Name,
                e.Invitee.Phone,
                e.Status == AttendanceEntryStatus.Present))
            .ToListAsync(ct);

        var priorPhones = await PriorPresentPhonesAsync(occurrenceId, scopeNodeId, ct);
        var result = GuestRisk.Score(presentMembers, invitees, priorPhones);

        submission.GuestRiskLevel = result.Level;
        submission.GuestRiskReasons = SerializeReasons(result.Reasons);
    }

    public static IReadOnlyList<string> ParseReasons(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string SerializeReasons(IReadOnlyList<string> reasons) =>
        JsonSerializer.Serialize(reasons);

    async Task<HashSet<string>> PriorPresentPhonesAsync(
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        var phones = await (
            from entry in db.AttendanceInviteeEntries.AsNoTracking()
            join invitee in db.AttendanceCellInvitees.AsNoTracking() on entry.InviteeId equals invitee.Id
            join submission in db.AttendanceScopeSubmissions.AsNoTracking()
                on new { entry.OccurrenceId, entry.ScopeNodeId }
                equals new { submission.OccurrenceId, submission.ScopeNodeId }
            where entry.ScopeNodeId == scopeNodeId
                && entry.OccurrenceId != occurrenceId
                && entry.Status == AttendanceEntryStatus.Present
                && (submission.ApprovalStatus == AttendanceScopeApprovalStatus.PendingApproval
                    || submission.ApprovalStatus == AttendanceScopeApprovalStatus.Approved)
            select invitee.Phone
        ).ToListAsync(ct);

        return phones
            .Select(GuestRisk.NormalizePhone)
            .Where(phone => phone.Length > 0)
            .ToHashSet();
    }
}
