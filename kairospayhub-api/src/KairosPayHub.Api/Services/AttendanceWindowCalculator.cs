namespace KairosPayHub.Api.Services;

public static class AttendanceWindowCalculator
{
    public static (DateTimeOffset OpensAt, DateTimeOffset DeadlineAt) Compute(
        DateOnly meetingDate,
        int opensDayOffset,
        TimeOnly opensTimeUtc,
        int deadlineDayOffset,
        TimeOnly deadlineTimeUtc)
    {
        var opensDate = meetingDate.AddDays(opensDayOffset);
        var deadlineDate = meetingDate.AddDays(deadlineDayOffset);
        var opensAt = new DateTimeOffset(opensDate.ToDateTime(opensTimeUtc), TimeSpan.Zero);
        var deadlineAt = new DateTimeOffset(deadlineDate.ToDateTime(deadlineTimeUtc), TimeSpan.Zero);

        if (opensAt >= deadlineAt)
            throw new ArgumentException("SubmissionOpensAt must be before SubmissionDeadlineAt.");

        return (opensAt, deadlineAt);
    }
}
