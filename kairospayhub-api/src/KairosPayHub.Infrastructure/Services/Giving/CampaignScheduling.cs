using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Giving;

namespace KairosPayHub.Api.Services;

public static class CampaignScheduling
{
    public const int MaxBatchSubCampaigns = 366;

    public static string DerivePeriodLabel(DateOnly? startsOn, DateOnly? endsOn, string? explicitLabel)
    {
        if (!string.IsNullOrWhiteSpace(explicitLabel))
            return explicitLabel.Trim();

        if (startsOn is null && endsOn is null)
            throw new BadRequestException("Period label or campaign dates are required");

        var start = startsOn ?? endsOn!.Value;
        var end = endsOn ?? startsOn!.Value;

        if (start == end)
            return start.ToString("d MMM yyyy");

        if (start.Year == end.Year && start.Month == end.Month)
            return start.ToString("MMMM yyyy");

        if (start.Year == end.Year)
            return $"{start:MMM} – {end:MMM yyyy}";

        return $"{start:MMM yyyy} – {end:MMM yyyy}";
    }

    public static IEnumerable<DateOnly> EnumerateWeeklyOccurrences(
        DayOfWeek dayOfWeek,
        DateOnly rangeStart,
        DateOnly rangeEnd)
    {
        if (rangeEnd < rangeStart)
            yield break;

        var cursor = rangeStart;
        while (cursor.DayOfWeek != dayOfWeek)
        {
            cursor = cursor.AddDays(1);
            if (cursor > rangeEnd)
                yield break;
        }

        while (cursor <= rangeEnd)
        {
            yield return cursor;
            cursor = cursor.AddDays(7);
        }
    }

    public static string BuildSubCampaignTitle(DateOnly eventDate, string? titlePrefix)
    {
        var formatted = eventDate.ToString("dddd d MMM");
        return string.IsNullOrWhiteSpace(titlePrefix)
            ? formatted
            : $"{titlePrefix.Trim()} {formatted}";
    }

    public static DateTimeOffset ComputeLogOpensAt(DateOnly eventDate, int logOpensOffsetDays)
    {
        var opensOn = eventDate.AddDays(logOpensOffsetDays);
        return new DateTimeOffset(opensOn.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
    }

    public static bool IsLoggingOpen(GivingProgram program, DateTimeOffset now)
    {
        if (program.LogOpensAt is null)
            return true;

        return program.LogOpensAt <= now;
    }

    public static bool AcceptsContributionsNow(GivingProgram program, DateTimeOffset now)
    {
        return program.ApprovalStatus == ProgramApprovalStatus.Approved
            && program.Status == ProgramStatus.Open
            && IsLoggingOpen(program, now);
    }
}
