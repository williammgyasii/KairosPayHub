namespace KairosPayHub.Api.Services;

/// <summary>
/// Pending-approval wording. What changes: submitter, role label, unit, meeting, report vs roll call.
/// What stays: recipients and delivery.
/// </summary>
public static class AttendanceSubmitNotificationCopy
{
    public static (string Title, string Body) Pending(
        string? submitterName,
        string? submitterRoleLabel,
        string unitName,
        string meetingTitle,
        bool hasReport)
    {
        var kind = hasReport ? "meeting report" : "roll call";
        var title = $"{unitName} {kind} awaiting approval";
        var body = $"{Who(submitterName, submitterRoleLabel)} submitted the {unitName} {kind} for {meetingTitle}.";
        return (title, body);
    }

    private static string Who(string? submitterName, string? submitterRoleLabel)
    {
        var name = submitterName?.Trim();
        var role = submitterRoleLabel?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return string.IsNullOrWhiteSpace(role) ? "A leader" : role;
        return string.IsNullOrWhiteSpace(role) ? name : $"{name} · {role}";
    }
}
