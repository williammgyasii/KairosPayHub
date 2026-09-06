using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class AttendanceOccurrenceGenerator(KairosDbContext db, AttendanceRollCallSyncService rollCallSync)
{
    public async Task EnsureOccurrencesAsync(Guid meetingTypeId, CancellationToken ct = default)
    {
        var meetingType = await db.AttendanceMeetingTypes
            .Include(t => t.ScopeNodes)
            .SingleOrDefaultAsync(t => t.Id == meetingTypeId, ct)
            ?? throw new BadRequestException("Meeting type not found");

        if (!meetingType.IsActive || meetingType.RecurrenceKind != AttendanceRecurrenceKind.Weekly)
            return;

        var timeZoneId = await db.StructureChurches.AsNoTracking()
            .Where(c => c.Id == meetingType.ChurchId)
            .Select(c => c.TimeZoneId)
            .FirstOrDefaultAsync(ct) ?? "UTC";

        var today = AttendanceWindowCalculator.TodayInTimeZone(timeZoneId);
        var end = today.AddDays(meetingType.AutoGenerateWeeksAhead * 7);

        for (var date = today; date <= end; date = date.AddDays(1))
        {
            if (date.DayOfWeek != meetingType.DayOfWeek)
                continue;

            var exists = await db.AttendanceOccurrences.AsNoTracking()
                .AnyAsync(o => o.MeetingTypeId == meetingTypeId && o.MeetingDate == date, ct);
            if (exists)
                continue;

            await CreateOccurrenceAsync(meetingType, date, timeZoneId, ct);
        }
    }

    private async Task CreateOccurrenceAsync(
        AttendanceMeetingType meetingType,
        DateOnly meetingDate,
        string timeZoneId,
        CancellationToken ct)
    {
        DateTimeOffset opensAt;
        DateTimeOffset deadlineAt;
        if (meetingType.IsAlwaysOpen)
        {
            (opensAt, deadlineAt) = AlwaysOpenWindow(meetingDate);
        }
        else
        {
            (opensAt, deadlineAt) = AttendanceWindowCalculator.Compute(
                meetingDate,
                meetingType.OpensDayOffset,
                meetingType.OpensTimeUtc,
                meetingType.DeadlineDayOffset,
                meetingType.DeadlineTimeUtc,
                timeZoneId);
        }

        var occurrence = new AttendanceOccurrence
        {
            ChurchId = meetingType.ChurchId,
            MeetingTypeId = meetingType.Id,
            MeetingDate = meetingDate,
            SubmissionOpensAt = opensAt,
            SubmissionDeadlineAt = deadlineAt,
            Status = meetingType.IsAlwaysOpen || DateTimeOffset.UtcNow >= opensAt
                ? AttendanceOccurrenceStatus.Open
                : AttendanceOccurrenceStatus.Scheduled,
        };

        db.AttendanceOccurrences.Add(occurrence);
        await db.SaveChangesAsync(ct);

        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrence.Id, ct);
    }

    public async Task ApplyAlwaysOpenWindowsAsync(Guid meetingTypeId, CancellationToken ct = default)
    {
        var occurrences = await db.AttendanceOccurrences
            .Where(o => o.MeetingTypeId == meetingTypeId)
            .ToListAsync(ct);

        foreach (var occurrence in occurrences)
        {
            var (opensAt, deadlineAt) = AlwaysOpenWindow(occurrence.MeetingDate);
            occurrence.SubmissionOpensAt = opensAt;
            occurrence.SubmissionDeadlineAt = deadlineAt;
            if (occurrence.Status != AttendanceOccurrenceStatus.Excused)
                occurrence.Status = AttendanceOccurrenceStatus.Open;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task OpenTodayForDemoAsync(Guid meetingTypeId, CancellationToken ct = default)
    {
        var meetingType = await db.AttendanceMeetingTypes.AsNoTracking()
            .SingleOrDefaultAsync(t => t.Id == meetingTypeId, ct);
        if (meetingType is null)
            return;

        var timeZoneId = await db.StructureChurches.AsNoTracking()
            .Where(c => c.Id == meetingType.ChurchId)
            .Select(c => c.TimeZoneId)
            .FirstOrDefaultAsync(ct) ?? "UTC";

        var today = AttendanceWindowCalculator.TodayInTimeZone(timeZoneId);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.MeetingTypeId == meetingTypeId && o.MeetingDate == today, ct);

        if (occurrence is null)
            return;

        var now = DateTimeOffset.UtcNow;
        occurrence.Status = AttendanceOccurrenceStatus.Open;
        occurrence.SubmissionOpensAt = now.AddMinutes(-5);
        occurrence.SubmissionDeadlineAt = now.AddDays(2);

        foreach (var submission in occurrence.ScopeSubmissions)
        {
            if (submission.ApprovalStatus is AttendanceScopeApprovalStatus.Draft
                or AttendanceScopeApprovalStatus.Rejected)
            {
                submission.LockStatus = AttendanceScopeLockStatus.Editable;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    static (DateTimeOffset OpensAt, DateTimeOffset DeadlineAt) AlwaysOpenWindow(DateOnly meetingDate)
    {
        var opensAt = new DateTimeOffset(meetingDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).AddYears(-1);
        var deadlineAt = new DateTimeOffset(meetingDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).AddYears(10);
        return (opensAt, deadlineAt);
    }
}
