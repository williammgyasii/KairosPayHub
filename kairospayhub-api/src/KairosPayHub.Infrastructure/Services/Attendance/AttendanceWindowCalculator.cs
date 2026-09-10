namespace KairosPayHub.Api.Services;

public static class AttendanceWindowCalculator
{
    /// <summary>
    /// Builds UTC submission window instants from a meeting calendar date and church-local wall times.
    /// </summary>
    public static (DateTimeOffset OpensAt, DateTimeOffset DeadlineAt) Compute(
        DateOnly meetingDate,
        int opensDayOffset,
        TimeOnly opensLocalTime,
        int deadlineDayOffset,
        TimeOnly deadlineLocalTime,
        string? timeZoneId = null)
    {
        var tz = ResolveTimeZone(timeZoneId);
        var opensAt = ToUtcInstant(meetingDate.AddDays(opensDayOffset), opensLocalTime, tz);
        var deadlineAt = ToUtcInstant(meetingDate.AddDays(deadlineDayOffset), deadlineLocalTime, tz);

        if (opensAt >= deadlineAt)
            throw new ArgumentException("SubmissionOpensAt must be before SubmissionDeadlineAt.");

        return (opensAt, deadlineAt);
    }

    /// <summary>Legacy UTC-wall overload kept for older call sites; prefer timezone-aware Compute.</summary>
    public static (DateTimeOffset OpensAt, DateTimeOffset DeadlineAt) ComputeUtcWall(
        DateOnly meetingDate,
        int opensDayOffset,
        TimeOnly opensTimeUtc,
        int deadlineDayOffset,
        TimeOnly deadlineTimeUtc) =>
        Compute(meetingDate, opensDayOffset, opensTimeUtc, deadlineDayOffset, deadlineTimeUtc, "UTC");

    public static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        var id = string.IsNullOrWhiteSpace(timeZoneId) ? "UTC" : timeZoneId.Trim();
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException)
        {
            // Windows may use different IDs; fall back to UTC rather than crashing attendance.
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    /// <summary>Calendar "today" in the church timezone (not UTC).</summary>
    public static DateOnly TodayInTimeZone(string? timeZoneId, DateTimeOffset? utcNow = null)
    {
        var tz = ResolveTimeZone(timeZoneId);
        var instant = utcNow ?? DateTimeOffset.UtcNow;
        var local = TimeZoneInfo.ConvertTime(instant, tz);
        return DateOnly.FromDateTime(local.DateTime);
    }

    static DateTimeOffset ToUtcInstant(DateOnly date, TimeOnly localTime, TimeZoneInfo tz)
    {
        var local = date.ToDateTime(localTime, DateTimeKind.Unspecified);
        var utc = TimeZoneInfo.ConvertTimeToUtc(local, tz);
        return new DateTimeOffset(utc, TimeSpan.Zero);
    }
}
