using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class AttendanceSubmitNotificationCopyTests
{
    [Fact]
    public void Roll_call_names_submitter_role_unit_and_meeting()
    {
        var copy = AttendanceSubmitNotificationCopy.Pending(
            submitterName: "Bob Cell",
            submitterRoleLabel: "Cell Leader",
            unitName: "Cell A",
            meetingTitle: "Sunday Service",
            hasReport: false);

        Assert.Equal("Cell A roll call awaiting approval", copy.Title);
        Assert.Equal(
            "Bob Cell · Cell Leader submitted the Cell A roll call for Sunday Service.",
            copy.Body);
    }

    [Fact]
    public void Meeting_report_uses_report_wording_not_a_meeting_title_gate()
    {
        var copy = AttendanceSubmitNotificationCopy.Pending(
            submitterName: "Ada Mensah",
            submitterRoleLabel: "Fellowship Leader",
            unitName: "Titans",
            meetingTitle: "Cell Meeting",
            hasReport: true);

        Assert.Equal("Titans meeting report awaiting approval", copy.Title);
        Assert.Equal(
            "Ada Mensah · Fellowship Leader submitted the Titans meeting report for Cell Meeting.",
            copy.Body);
    }

    [Fact]
    public void Missing_name_falls_back_to_role_or_a_leader()
    {
        var byRole = AttendanceSubmitNotificationCopy.Pending(
            submitterName: null,
            submitterRoleLabel: "Cell Leader",
            unitName: "Zion",
            meetingTitle: "Sunday Service",
            hasReport: false);
        Assert.Equal("Cell Leader submitted the Zion roll call for Sunday Service.", byRole.Body);

        var anonymous = AttendanceSubmitNotificationCopy.Pending(
            submitterName: "  ",
            submitterRoleLabel: null,
            unitName: "Zion",
            meetingTitle: "Sunday Service",
            hasReport: true);
        Assert.Equal("A leader submitted the Zion meeting report for Sunday Service.", anonymous.Body);
    }
}
