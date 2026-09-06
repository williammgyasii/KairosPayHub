using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class AttendanceWindowCalculatorTests
{
    [Fact]
    public void Sunday_service_opens_after_service_closes_monday_midnight_utc()
    {
        var meetingDate = new DateOnly(2026, 8, 10);

        var (opensAt, deadlineAt) = AttendanceWindowCalculator.Compute(
            meetingDate,
            opensDayOffset: 0,
            opensLocalTime: new TimeOnly(14, 0),
            deadlineDayOffset: 1,
            deadlineLocalTime: TimeOnly.MinValue,
            timeZoneId: "UTC");

        Assert.Equal(new DateTimeOffset(2026, 8, 10, 14, 0, 0, TimeSpan.Zero), opensAt);
        Assert.Equal(new DateTimeOffset(2026, 8, 11, 0, 0, 0, TimeSpan.Zero), deadlineAt);
        Assert.True(opensAt < deadlineAt);
    }

    [Fact]
    public void Accra_saturday_21_open_is_utc_instant_in_africa_accra()
    {
        var meetingDate = new DateOnly(2026, 8, 8); // Saturday

        var (opensAt, deadlineAt) = AttendanceWindowCalculator.Compute(
            meetingDate,
            opensDayOffset: 0,
            opensLocalTime: new TimeOnly(21, 0),
            deadlineDayOffset: 1,
            deadlineLocalTime: new TimeOnly(12, 0),
            timeZoneId: "Africa/Accra");

        // Accra is GMT+0 year-round
        Assert.Equal(new DateTimeOffset(2026, 8, 8, 21, 0, 0, TimeSpan.Zero), opensAt);
        Assert.Equal(new DateTimeOffset(2026, 8, 9, 12, 0, 0, TimeSpan.Zero), deadlineAt);
    }

    [Fact]
    public void Throws_when_open_is_not_before_deadline()
    {
        var meetingDate = new DateOnly(2026, 8, 10);

        Assert.Throws<ArgumentException>(() => AttendanceWindowCalculator.Compute(
            meetingDate,
            opensDayOffset: 1,
            opensLocalTime: new TimeOnly(0, 0),
            deadlineDayOffset: 0,
            deadlineLocalTime: new TimeOnly(23, 0)));
    }

    [Fact]
    public void TodayInTimeZone_keeps_saturday_evening_toronto_when_utc_already_sunday()
    {
        // Saturday 2026-09-05 22:00 America/Toronto == Sunday 2026-09-06 02:00 UTC
        var utcNow = new DateTimeOffset(2026, 9, 6, 2, 0, 0, TimeSpan.Zero);
        var today = AttendanceWindowCalculator.TodayInTimeZone("America/Toronto", utcNow);
        Assert.Equal(new DateOnly(2026, 9, 5), today);
    }
}
