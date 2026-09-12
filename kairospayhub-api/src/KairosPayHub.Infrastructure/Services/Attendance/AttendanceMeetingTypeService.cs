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
    int AutoGenerateWeeksAhead,
    Guid? SubmissionLayerId = null,
    bool IsAlwaysOpen = false,
    bool OpenNowForDemo = false,
    bool RequiresReport = false,
    IReadOnlyList<AttendanceReportFieldDto>? ReportSchema = null);

public record UpdateAttendanceMeetingTypeInput(
    string Title,
    int OpensDayOffset,
    string OpensTimeUtc,
    int DeadlineDayOffset,
    string DeadlineTimeUtc,
    Guid? SubmissionLayerId = null,
    bool IsAlwaysOpen = false,
    bool? RequiresReport = null,
    IReadOnlyList<AttendanceReportFieldDto>? ReportSchema = null);

public record AttendanceMeetingTypeDto(
    Guid Id,
    string Title,
    string RecurrenceKind,
    string DayOfWeek,
    string ScopeKind,
    Guid? ScopeNodeId,
    Guid? SubmissionLayerId,
    string? SubmissionLayerName,
    int OpensDayOffset,
    string OpensTimeUtc,
    int DeadlineDayOffset,
    string DeadlineTimeUtc,
    int AutoGenerateWeeksAhead,
    bool IsAlwaysOpen,
    bool IsActive,
    DateTimeOffset CreatedAt,
    bool RequiresReport,
    IReadOnlyList<AttendanceReportFieldDto> ReportSchema);

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
    AttendanceOccurrenceGenerator occurrenceGenerator,
    MeetingTypeNotificationService meetingTypeNotifications)
{
    public async Task<IReadOnlyList<AttendanceMeetingTypeDto>> ListAsync(Actor actor, CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);
        var types = await db.AttendanceMeetingTypes.AsNoTracking()
            .Where(t => t.ChurchId == churchId && t.IsActive)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        var layerIds = types.Where(t => t.SubmissionLayerId != null).Select(t => t.SubmissionLayerId!.Value).Distinct().ToList();
        var layerNames = layerIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.StructureLayers.AsNoTracking()
                .Where(l => layerIds.Contains(l.Id))
                .ToDictionaryAsync(l => l.Id, l => l.DisplayName, ct);

        return types.Select(t => ToDto(
            t,
            t.SubmissionLayerId is Guid id && layerNames.TryGetValue(id, out var name) ? name : null)).ToList();
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

        var submissionLayerId = await ResolveSubmissionLayerIdAsync(churchId, input.SubmissionLayerId, ct);

        var meetingType = new AttendanceMeetingType
        {
            ChurchId = churchId,
            Title = input.Title.Trim(),
            RecurrenceKind = ParseRecurrenceKind(input.RecurrenceKind),
            DayOfWeek = ParseDayOfWeek(input.DayOfWeek),
            ScopeKind = ParseScopeKind(input.ScopeKind),
            ScopeNodeId = input.ScopeNodeId,
            SubmissionLayerId = submissionLayerId,
            OpensDayOffset = input.IsAlwaysOpen ? 0 : input.OpensDayOffset,
            OpensTimeUtc = input.IsAlwaysOpen
                ? new TimeOnly(0, 0)
                : ParseTime(input.OpensTimeUtc, "OpensTimeUtc"),
            DeadlineDayOffset = input.IsAlwaysOpen ? 1 : input.DeadlineDayOffset,
            DeadlineTimeUtc = input.IsAlwaysOpen
                ? new TimeOnly(23, 59)
                : ParseTime(input.DeadlineTimeUtc, "DeadlineTimeUtc"),
            AutoGenerateWeeksAhead = input.AutoGenerateWeeksAhead > 0 ? input.AutoGenerateWeeksAhead : 8,
            IsAlwaysOpen = input.IsAlwaysOpen,
            CreatedByAuthUserId = authUserId,
        };

        var (requiresReport, schemaJson) = AttendanceReportPolicy.NormalizeSchema(
            input.RequiresReport,
            input.ReportSchema);
        meetingType.RequiresReport = requiresReport;
        meetingType.ReportSchema = schemaJson;

        await ValidateWindowAsync(meetingType, churchId, ct);

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
        if (input.OpenNowForDemo)
            await occurrenceGenerator.OpenTodayForDemoAsync(meetingType.Id, ct);

        await meetingTypeNotifications.NotifyCreatedAsync(
            churchId,
            meetingType.Id,
            meetingType.Title,
            authUserId,
            ct);

        return ToDto(meetingType, await LayerNameAsync(meetingType.SubmissionLayerId, ct));
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
        meetingType.IsAlwaysOpen = input.IsAlwaysOpen;
        if (input.SubmissionLayerId is Guid requestedLayer)
            meetingType.SubmissionLayerId = await ResolveSubmissionLayerIdAsync(churchId, requestedLayer, ct);
        else if (meetingType.SubmissionLayerId is null)
            meetingType.SubmissionLayerId = await ResolveSubmissionLayerIdAsync(churchId, null, ct);

        if (input.IsAlwaysOpen)
        {
            meetingType.OpensDayOffset = 0;
            meetingType.OpensTimeUtc = new TimeOnly(0, 0);
            meetingType.DeadlineDayOffset = 1;
            meetingType.DeadlineTimeUtc = new TimeOnly(23, 59);
        }
        else
        {
            meetingType.OpensDayOffset = input.OpensDayOffset;
            meetingType.OpensTimeUtc = ParseTime(input.OpensTimeUtc, "OpensTimeUtc");
            meetingType.DeadlineDayOffset = input.DeadlineDayOffset;
            meetingType.DeadlineTimeUtc = ParseTime(input.DeadlineTimeUtc, "DeadlineTimeUtc");
        }

        if (input.RequiresReport is bool requiresFlag)
        {
            var (requiresReport, schemaJson) = AttendanceReportPolicy.NormalizeSchema(
                requiresFlag,
                input.ReportSchema);
            meetingType.RequiresReport = requiresReport;
            meetingType.ReportSchema = schemaJson;
        }

        await ValidateWindowAsync(meetingType, churchId, ct);
        await db.SaveChangesAsync(ct);

        if (meetingType.IsAlwaysOpen)
            await occurrenceGenerator.ApplyAlwaysOpenWindowsAsync(meetingType.Id, ct);

        return ToDto(meetingType, await LayerNameAsync(meetingType.SubmissionLayerId, ct));
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

        await occurrenceGenerator.EnsureOccurrencesAsync(meetingTypeId, ct);

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

    private async Task ValidateWindowAsync(
        AttendanceMeetingType meetingType,
        Guid churchId,
        CancellationToken ct)
    {
        if (meetingType.IsAlwaysOpen)
            return;

        if (meetingType.OpensDayOffset is < 0 or > 1 || meetingType.DeadlineDayOffset is < 0 or > 1)
            throw new BadRequestException("Open and deadline days must be the meeting day or the next day");

        var timeZoneId = await db.StructureChurches.AsNoTracking()
            .Where(c => c.Id == churchId)
            .Select(c => c.TimeZoneId)
            .FirstOrDefaultAsync(ct) ?? "UTC";

        try
        {
            _ = AttendanceWindowCalculator.Compute(
                new DateOnly(2026, 8, 10),
                meetingType.OpensDayOffset,
                meetingType.OpensTimeUtc,
                meetingType.DeadlineDayOffset,
                meetingType.DeadlineTimeUtc,
                timeZoneId);
        }
        catch (ArgumentException ex)
        {
            throw new BadRequestException(ex.Message);
        }
    }

    private async Task<Guid?> ResolveSubmissionLayerIdAsync(
        Guid churchId,
        Guid? requestedLayerId,
        CancellationToken ct)
    {
        var layers = await (
            from layer in db.StructureLayers.AsNoTracking()
            join template in db.StructureTemplates.AsNoTracking() on layer.TemplateId equals template.Id
            where template.ChurchId == churchId
            orderby layer.SortOrder
            select layer).ToListAsync(ct);

        if (layers.Count == 0)
        {
            if (requestedLayerId is not null)
                throw new BadRequestException("Church structure template has no layers");
            return null;
        }

        if (requestedLayerId is Guid id)
        {
            if (layers.All(l => l.Id != id))
                throw new BadRequestException("Submission layer is not part of this church’s structure");
            return id;
        }

        var cell = layers.FirstOrDefault(l => l.StandardType == StructureLayerType.Cell);
        return cell?.Id ?? layers[^1].Id;
    }

    private async Task<string?> LayerNameAsync(Guid? layerId, CancellationToken ct)
    {
        if (layerId is null) return null;
        return await db.StructureLayers.AsNoTracking()
            .Where(l => l.Id == layerId)
            .Select(l => l.DisplayName)
            .FirstOrDefaultAsync(ct);
    }

    private static AttendanceMeetingTypeDto ToDto(AttendanceMeetingType t, string? submissionLayerName = null) =>
        new(
            t.Id,
            t.Title,
            t.RecurrenceKind.ToString(),
            t.DayOfWeek.ToString(),
            t.ScopeKind.ToString(),
            t.ScopeNodeId,
            t.SubmissionLayerId,
            submissionLayerName ?? t.SubmissionLayer?.DisplayName,
            t.OpensDayOffset,
            t.OpensTimeUtc.ToString("HH:mm:ss"),
            t.DeadlineDayOffset,
            t.DeadlineTimeUtc.ToString("HH:mm:ss"),
            t.AutoGenerateWeeksAhead,
            t.IsAlwaysOpen,
            t.IsActive,
            t.CreatedAt,
            t.RequiresReport,
            AttendanceReportPolicy.SchemaForType(t.RequiresReport, t.ReportSchema).ToList());

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
