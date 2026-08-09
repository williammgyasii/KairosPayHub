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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = today.AddDays(meetingType.AutoGenerateWeeksAhead * 7);

        for (var date = today; date <= end; date = date.AddDays(1))
        {
            if (date.DayOfWeek != meetingType.DayOfWeek)
                continue;

            var exists = await db.AttendanceOccurrences.AsNoTracking()
                .AnyAsync(o => o.MeetingTypeId == meetingTypeId && o.MeetingDate == date, ct);
            if (exists)
                continue;

            await CreateOccurrenceAsync(meetingType, date, ct);
        }
    }

    private async Task CreateOccurrenceAsync(
        AttendanceMeetingType meetingType,
        DateOnly meetingDate,
        CancellationToken ct)
    {
        var (opensAt, deadlineAt) = AttendanceWindowCalculator.Compute(
            meetingDate,
            meetingType.OpensDayOffset,
            meetingType.OpensTimeUtc,
            meetingType.DeadlineDayOffset,
            meetingType.DeadlineTimeUtc);

        var occurrence = new AttendanceOccurrence
        {
            ChurchId = meetingType.ChurchId,
            MeetingTypeId = meetingType.Id,
            MeetingDate = meetingDate,
            SubmissionOpensAt = opensAt,
            SubmissionDeadlineAt = deadlineAt,
            Status = DateTimeOffset.UtcNow >= opensAt
                ? AttendanceOccurrenceStatus.Open
                : AttendanceOccurrenceStatus.Scheduled,
        };

        db.AttendanceOccurrences.Add(occurrence);
        await db.SaveChangesAsync(ct);

        await rollCallSync.EnsureOccurrenceRollCallAsync(occurrence.Id, ct);
    }
}
