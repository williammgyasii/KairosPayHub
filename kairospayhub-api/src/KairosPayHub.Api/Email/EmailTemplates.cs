namespace KairosPayHub.Api.Email;

public static class EmailTemplates
{
    public static (string Subject, string Body) LeaderLoginCredentials(
        string leaderName,
        string churchName,
        string roleTitle,
        string unitName,
        string loginUrl,
        string email,
        string temporaryPassword)
    {
        var subject = $"Your KairosPayHub login — {churchName}";
        var body = $"""
            Hi {leaderName},

            You've been added as {roleTitle} for {unitName} at {churchName}.

            Log in here:
            {loginUrl}

            Email: {email}
            Password: {temporaryPassword}

            Please change your password after your first login.

            — KairosPayHub
            """;

        return (subject, body);
    }
}
