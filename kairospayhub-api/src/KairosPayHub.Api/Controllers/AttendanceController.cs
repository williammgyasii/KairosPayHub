using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController(
    CurrentActor current,
    AttendanceMeetingTypeService meetingTypes,
    AttendanceSubmissionService submissions,
    AttendanceRollCallExtrasService rollCallExtras) : ControllerBase
{
    [HttpGet("meeting-types")]
    public async Task<IActionResult> ListMeetingTypes(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await meetingTypes.ListAsync(actor, ct);
        return Ok(list);
    }

    [HttpPost("meeting-types")]
    public async Task<IActionResult> CreateMeetingType(
        [FromBody] CreateAttendanceMeetingTypeRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var created = await meetingTypes.CreateAsync(
            actor,
            authUserId,
            new CreateAttendanceMeetingTypeInput(
                request.Title ?? string.Empty,
                request.RecurrenceKind ?? "Weekly",
                request.DayOfWeek ?? "Sunday",
                request.ScopeKind ?? "ChurchWide",
                request.ScopeNodeId,
                request.ScopeNodeIds,
                request.OpensDayOffset,
                request.OpensTimeUtc ?? "14:00:00",
                request.DeadlineDayOffset,
                request.DeadlineTimeUtc ?? "00:00:00",
                request.AutoGenerateWeeksAhead,
                request.OpenNowForDemo),
            ct);
        return Ok(created);
    }

    [HttpPatch("meeting-types/{meetingTypeId:guid}")]
    public async Task<IActionResult> UpdateMeetingType(
        Guid meetingTypeId,
        [FromBody] UpdateAttendanceMeetingTypeRequest request,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var updated = await meetingTypes.UpdateAsync(
            actor,
            meetingTypeId,
            new UpdateAttendanceMeetingTypeInput(
                request.Title ?? string.Empty,
                request.OpensDayOffset,
                request.OpensTimeUtc ?? "14:00:00",
                request.DeadlineDayOffset,
                request.DeadlineTimeUtc ?? "00:00:00"),
            ct);
        return Ok(updated);
    }

    [HttpDelete("meeting-types/{meetingTypeId:guid}")]
    public async Task<IActionResult> DeleteMeetingType(Guid meetingTypeId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        await meetingTypes.DeleteAsync(actor, meetingTypeId, ct);
        return Ok(new { ok = true });
    }

    [HttpGet("meeting-types/{meetingTypeId:guid}/occurrences")]
    public async Task<IActionResult> ListOccurrences(Guid meetingTypeId, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await meetingTypes.ListOccurrencesAsync(actor, meetingTypeId, ct);
        return Ok(list);
    }

    [HttpGet("occurrences/{occurrenceId:guid}")]
    public async Task<IActionResult> GetOccurrence(Guid occurrenceId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var detail = await submissions.GetOccurrenceAsync(actor, authUserId, occurrenceId, ct);
        return Ok(detail);
    }

    [HttpGet("occurrences/{occurrenceId:guid}/scopes/{scopeNodeId:guid}/review")]
    public async Task<IActionResult> GetScopeRollCallReview(
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var review = await submissions.GetScopeRollCallReviewAsync(
            actor,
            authUserId,
            occurrenceId,
            scopeNodeId,
            ct);
        return Ok(review);
    }

    [HttpGet("occurrences/{occurrenceId:guid}/rollup")]
    public async Task<IActionResult> GetOccurrenceRollup(
        Guid occurrenceId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? sortBy = "name",
        [FromQuery] string? sortDir = "asc",
        [FromQuery] string? search = null,
        [FromQuery] string? personKind = null,
        [FromQuery] string? cell = null,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var rollup = await submissions.GetOccurrenceRollupAsync(
            actor,
            authUserId,
            occurrenceId,
            new AttendanceRollupQuery(page, pageSize, sortBy ?? "name", sortDir ?? "asc", search, personKind, cell),
            ct);
        return Ok(rollup);
    }

    [HttpPut("occurrences/{occurrenceId:guid}/scopes/{scopeNodeId:guid}/entries")]
    public async Task<IActionResult> PutEntries(
        Guid occurrenceId,
        Guid scopeNodeId,
        [FromBody] PutAttendanceEntriesRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var updates = request.Entries?
            .Select(e => new AttendanceEntryUpdate(e.MemberId, e.Status ?? string.Empty))
            .ToList()
            ?? [];
        var firstTimers = request.FirstTimers?
            .Select(row => new AttendanceFirstTimerInput(row.Name ?? string.Empty, row.Phone, row.Notes))
            .ToList()
            ?? [];
        var inviteeEntries = request.InviteeEntries?
            .Select(row => new AttendanceInviteeEntryInput(row.InviteeId, row.Status ?? string.Empty, row.WasFirstTimer))
            .ToList()
            ?? [];

        await submissions.PutEntriesAsync(
            actor,
            authUserId,
            occurrenceId,
            scopeNodeId,
            updates,
            firstTimers,
            inviteeEntries,
            request.PastorOverride,
            ct);
        return Ok(new { ok = true });
    }

    [HttpGet("first-timers")]
    public async Task<IActionResult> ListFirstTimers(CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await rollCallExtras.ListApprovedFirstTimersAsync(actor, ct);
        return Ok(list);
    }

    [HttpGet("scopes/{scopeNodeId:guid}/invitees")]
    public async Task<IActionResult> ListCellInvitees(Guid scopeNodeId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var list = await rollCallExtras.ListCellInviteesAsync(actor, authUserId, scopeNodeId, ct);
        return Ok(list);
    }

    [HttpPost("scopes/{scopeNodeId:guid}/invitees")]
    public async Task<IActionResult> CreateCellInvitee(
        Guid scopeNodeId,
        [FromBody] CreateCellInviteeRequest request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var created = await rollCallExtras.CreateCellInviteeAsync(
            actor,
            authUserId,
            scopeNodeId,
            new CreateCellInviteeInput(
                request.Name ?? string.Empty,
                request.Phone ?? string.Empty,
                request.Notes,
                request.Residence,
                AttendanceInviteeRequestParsing.ParseOccupationStatus(request.OccupationStatus),
                request.SchoolOrWorkplace,
                request.IsFirstTimer,
                AttendanceInviteeRequestParsing.ParsePriorChurchAttendance(request.PriorChurchAttendance),
                request.InvitedByMemberId),
            ct);
        return Ok(created);
    }

    [HttpPost("invitees/{inviteeId:guid}/graduate")]
    public async Task<IActionResult> GraduateInvitee(Guid inviteeId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var member = await rollCallExtras.GraduateInviteeAsync(actor, authUserId, inviteeId, ct);
        return Ok(member);
    }

    [HttpPost("occurrences/{occurrenceId:guid}/scopes/{scopeNodeId:guid}/submit")]
    public async Task<IActionResult> Submit(
        Guid occurrenceId,
        Guid scopeNodeId,
        [FromBody] SubmitAttendanceScopeRequest? request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        await submissions.SubmitAsync(
            actor,
            authUserId,
            occurrenceId,
            scopeNodeId,
            request?.PastorOverride ?? false,
            ct);
        return Ok(new { ok = true });
    }

    [HttpGet("approval-queue")]
    public async Task<IActionResult> ListApprovalQueue(CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var queue = await submissions.ListApprovalQueueAsync(actor, authUserId, ct);
        return Ok(queue);
    }

    [HttpPost("occurrences/{occurrenceId:guid}/scopes/{scopeNodeId:guid}/approve")]
    public async Task<IActionResult> Approve(
        Guid occurrenceId,
        Guid scopeNodeId,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        var result = await submissions.ApproveAsync(actor, authUserId, occurrenceId, scopeNodeId, ct);
        return Ok(result);
    }

    [HttpPost("occurrences/{occurrenceId:guid}/scopes/{scopeNodeId:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid occurrenceId,
        Guid scopeNodeId,
        [FromBody] RejectAttendanceSubmissionRequest? request,
        CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            throw new UnauthorizedAccessException("Token has no subject");

        var actor = await current.RequireAsync(ct);
        await submissions.RejectAsync(
            actor,
            authUserId,
            occurrenceId,
            scopeNodeId,
            request?.Reason,
            ct);
        return Ok(new { ok = true });
    }
}

public sealed record RejectAttendanceSubmissionRequest(string? Reason);

public sealed class SubmitAttendanceScopeRequest
{
    public bool PastorOverride { get; set; }
}

public sealed record CreateAttendanceMeetingTypeRequest(
    string? Title,
    string? RecurrenceKind,
    string? DayOfWeek,
    string? ScopeKind,
    Guid? ScopeNodeId,
    IReadOnlyList<Guid>? ScopeNodeIds,
    int OpensDayOffset = 0,
    string? OpensTimeUtc = null,
    int DeadlineDayOffset = 1,
    string? DeadlineTimeUtc = null,
    int AutoGenerateWeeksAhead = 8,
    bool OpenNowForDemo = false);

public sealed record UpdateAttendanceMeetingTypeRequest(
    string? Title,
    int OpensDayOffset = 0,
    string? OpensTimeUtc = null,
    int DeadlineDayOffset = 1,
    string? DeadlineTimeUtc = null);

public sealed class PutAttendanceEntriesRequest
{
    public List<PutAttendanceEntryRequest>? Entries { get; set; }
    public List<PutAttendanceFirstTimerRequest>? FirstTimers { get; set; }
    public List<PutAttendanceInviteeEntryRequest>? InviteeEntries { get; set; }
    public bool PastorOverride { get; set; }
}

public sealed class PutAttendanceFirstTimerRequest
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
}

public sealed class PutAttendanceInviteeEntryRequest
{
    public Guid InviteeId { get; set; }
    public string? Status { get; set; }
    public bool WasFirstTimer { get; set; }
}

public sealed class CreateCellInviteeRequest
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public string? Residence { get; set; }
    public string? OccupationStatus { get; set; }
    public string? SchoolOrWorkplace { get; set; }
    public bool IsFirstTimer { get; set; }
    public string? PriorChurchAttendance { get; set; }
    public Guid InvitedByMemberId { get; set; }
}

public sealed class PutAttendanceEntryRequest
{
    public Guid MemberId { get; set; }
    public string? Status { get; set; }
}

internal static class AttendanceInviteeRequestParsing
{
    internal static MemberOccupationStatus? ParseOccupationStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!Enum.TryParse<MemberOccupationStatus>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException("Invalid occupation status");

        return parsed;
    }

    internal static InviteePriorChurchAttendance? ParsePriorChurchAttendance(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!Enum.TryParse<InviteePriorChurchAttendance>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException("Invalid previous church attendance");

        return parsed;
    }
}
