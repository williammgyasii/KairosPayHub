using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class AttendanceWindowCalculatorTests
{
    [Fact]
    public void Sunday_service_opens_after_service_closes_monday_midnight_gmt()
    {
        var meetingDate = new DateOnly(2026, 8, 10);

        var (opensAt, deadlineAt) = AttendanceWindowCalculator.Compute(
            meetingDate,
            opensDayOffset: 0,
            opensTimeUtc: new TimeOnly(14, 0),
            deadlineDayOffset: 1,
            deadlineTimeUtc: TimeOnly.MinValue);

        Assert.Equal(new DateTimeOffset(2026, 8, 10, 14, 0, 0, TimeSpan.Zero), opensAt);
        Assert.Equal(new DateTimeOffset(2026, 8, 11, 0, 0, 0, TimeSpan.Zero), deadlineAt);
        Assert.True(opensAt < deadlineAt);
    }

    [Fact]
    public void Throws_when_open_is_not_before_deadline()
    {
        var meetingDate = new DateOnly(2026, 8, 10);

        Assert.Throws<ArgumentException>(() => AttendanceWindowCalculator.Compute(
            meetingDate,
            opensDayOffset: 1,
            opensTimeUtc: new TimeOnly(0, 0),
            deadlineDayOffset: 0,
            deadlineTimeUtc: new TimeOnly(23, 0)));
    }
}
