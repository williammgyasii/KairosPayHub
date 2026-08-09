using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record CreateAttendanceMeetingTypeInput(
    string Title,
    string RecurrenceKind,
    string DayOfWeek,
    string ScopeKind,
    Guid? ScopeNodeId,
    IReadOnlyList<Guid>? ScopeNodeIds,
    int OpensDayOffset,
    string OpensTimeUtc,
    int DeadlineDayOffset,
    string DeadlineTimeUtc,
    int AutoGenerateWeeksAhead);

public record UpdateAttendanceMeetingTypeInput(
    string Title,
    int OpensDayOffset,
    string OpensTimeUtc,
    int DeadlineDayOffset,
    string DeadlineTimeUtc);

public record AttendanceMeetingTypeDto(
    Guid Id,
    string Title,
    string RecurrenceKind,
    string DayOfWeek,
    string ScopeKind,
    Guid? ScopeNodeId,
    int OpensDayOffset,
    string OpensTimeUtc,
    int DeadlineDayOffset,
    string DeadlineTimeUtc,
    int AutoGenerateWeeksAhead,
    bool IsActive,
    DateTimeOffset CreatedAt);

public record AttendanceOccurrenceSummaryDto(
    Guid Id,
    DateOnly MeetingDate,
    string Status,
    DateTimeOffset SubmissionOpensAt,
    DateTimeOffset SubmissionDeadlineAt,
    int ScopeSubmissionCount);

public class AttendanceMeetingTypeService(
    KairosDbContext db,
    GivingScopeService scope,
    AttendanceOccurrenceGenerator occurrenceGenerator)
{
    public async Task<IReadOnlyList<AttendanceMeetingTypeDto>> ListAsync(Actor actor, CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var types = await db.AttendanceMeetingTypes.AsNoTracking()
            .Where(t => t.ChurchId == churchId && t.IsActive)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        return types.Select(ToDto).ToList();
    }

    public async Task<AttendanceMeetingTypeDto> CreateAsync(
        Actor actor,
        Guid authUserId,
        CreateAttendanceMeetingTypeInput input,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor or church admin can create meeting types");

        var churchId = RequireStructureChurch(actor);
        ValidateInput(input);

        var meetingType = new AttendanceMeetingType
        {
            ChurchId = churchId,
            Title = input.Title.Trim(),
            RecurrenceKind = ParseRecurrenceKind(input.RecurrenceKind),
            DayOfWeek = ParseDayOfWeek(input.DayOfWeek),
            ScopeKind = ParseScopeKind(input.ScopeKind),
            ScopeNodeId = input.ScopeNodeId,
            OpensDayOffset = input.OpensDayOffset,
            OpensTimeUtc = ParseTime(input.OpensTimeUtc, "OpensTimeUtc"),
            DeadlineDayOffset = input.DeadlineDayOffset,
            DeadlineTimeUtc = ParseTime(input.DeadlineTimeUtc, "DeadlineTimeUtc"),
            AutoGenerateWeeksAhead = input.AutoGenerateWeeksAhead > 0 ? input.AutoGenerateWeeksAhead : 8,
            CreatedByAuthUserId = authUserId,
        };

        ValidateWindow(meetingType);

        if (meetingType.ScopeKind == ProgramScopeKind.FellowshipGroup && input.ScopeNodeIds is not null)
        {
            foreach (var nodeId in input.ScopeNodeIds.Distinct())
            {
                meetingType.ScopeNodes.Add(new AttendanceMeetingTypeScopeNode
                {
                    StructureNodeId = nodeId,
                });
            }
        }

        db.AttendanceMeetingTypes.Add(meetingType);
        await db.SaveChangesAsync(ct);
        await occurrenceGenerator.EnsureOccurrencesAsync(meetingType.Id, ct);

        return ToDto(meetingType);
    }

    public async Task<AttendanceMeetingTypeDto> UpdateAsync(
        Actor actor,
        Guid meetingTypeId,
        UpdateAttendanceMeetingTypeInput input,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor or church admin can update meeting types");

        var churchId = RequireStructureChurch(actor);
        if (string.IsNullOrWhiteSpace(input.Title))
            throw new BadRequestException("Title is required");

        var meetingType = await db.AttendanceMeetingTypes
            .SingleOrDefaultAsync(t => t.Id == meetingTypeId && t.ChurchId == churchId && t.IsActive, ct)
            ?? throw new ForbiddenException("Meeting type not found");

        meetingType.Title = input.Title.Trim();
        meetingType.OpensDayOffset = input.OpensDayOffset;
        meetingType.OpensTimeUtc = ParseTime(input.OpensTimeUtc, "OpensTimeUtc");
        meetingType.DeadlineDayOffset = input.DeadlineDayOffset;
        meetingType.DeadlineTimeUtc = ParseTime(input.DeadlineTimeUtc, "DeadlineTimeUtc");

        ValidateWindow(meetingType);
        await db.SaveChangesAsync(ct);

        return ToDto(meetingType);
    }

    public async Task DeleteAsync(Actor actor, Guid meetingTypeId, CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor or church admin can delete meeting types");

        var churchId = RequireStructureChurch(actor);
        var meetingType = await db.AttendanceMeetingTypes
            .SingleOrDefaultAsync(t => t.Id == meetingTypeId && t.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Meeting type not found");

        db.AttendanceMeetingTypes.Remove(meetingType);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AttendanceOccurrenceSummaryDto>> ListOccurrencesAsync(
        Actor actor,
        Guid meetingTypeId,
        CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        _ = await db.AttendanceMeetingTypes.AsNoTracking()
            .SingleOrDefaultAsync(t => t.Id == meetingTypeId && t.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Meeting type not found");

        var occurrences = await db.AttendanceOccurrences.AsNoTracking()
            .Where(o => o.MeetingTypeId == meetingTypeId)
            .OrderBy(o => o.MeetingDate)
            .Select(o => new
            {
                o.Id,
                o.MeetingDate,
                o.Status,
                o.SubmissionOpensAt,
                o.SubmissionDeadlineAt,
                ScopeSubmissionCount = o.ScopeSubmissions.Count,
            })
            .ToListAsync(ct);

        return occurrences
            .Select(o => new AttendanceOccurrenceSummaryDto(
                o.Id,
                o.MeetingDate,
                o.Status.ToString(),
                o.SubmissionOpensAt,
                o.SubmissionDeadlineAt,
                o.ScopeSubmissionCount))
            .ToList();
    }

    private static void ValidateInput(CreateAttendanceMeetingTypeInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Title))
            throw new BadRequestException("Title is required");
        if (input.AutoGenerateWeeksAhead is < 1 or > 52)
            throw new BadRequestException("AutoGenerateWeeksAhead must be between 1 and 52");
    }

    private static void ValidateWindow(AttendanceMeetingType meetingType)
    {
        _ = AttendanceWindowCalculator.Compute(
            new DateOnly(2026, 8, 10),
            meetingType.OpensDayOffset,
            meetingType.OpensTimeUtc,
            meetingType.DeadlineDayOffset,
            meetingType.DeadlineTimeUtc);
    }

    private static AttendanceMeetingTypeDto ToDto(AttendanceMeetingType t) =>
        new(
            t.Id,
            t.Title,
            t.RecurrenceKind.ToString(),
            t.DayOfWeek.ToString(),
            t.ScopeKind.ToString(),
            t.ScopeNodeId,
            t.OpensDayOffset,
            t.OpensTimeUtc.ToString("HH:mm:ss"),
            t.DeadlineDayOffset,
            t.DeadlineTimeUtc.ToString("HH:mm:ss"),
            t.AutoGenerateWeeksAhead,
            t.IsActive,
            t.CreatedAt);

    private static AttendanceRecurrenceKind ParseRecurrenceKind(string value)
    {
        if (!Enum.TryParse<AttendanceRecurrenceKind>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown recurrence kind: {value}");
        return parsed;
    }

    private static DayOfWeek ParseDayOfWeek(string value)
    {
        if (!Enum.TryParse<DayOfWeek>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown day of week: {value}");
        return parsed;
    }

    private static ProgramScopeKind ParseScopeKind(string value)
    {
        if (!Enum.TryParse<ProgramScopeKind>(value, ignoreCase: true, out var parsed))
            throw new BadRequestException($"Unknown scope kind: {value}");
        return parsed;
    }

    private static TimeOnly ParseTime(string value, string fieldName)
    {
        if (!TimeOnly.TryParse(value, out var parsed))
            throw new BadRequestException($"{fieldName} must be a valid time (HH:mm:ss)");
        return parsed;
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }
}
