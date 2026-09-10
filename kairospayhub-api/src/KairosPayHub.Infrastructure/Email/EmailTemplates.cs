namespace KairosPayHub.Api.Email;

public static class EmailTemplates
{
    public static (string Subject, string Body) LeaderSetPasswordInvite(
        string leaderName,
        string churchName,
        string roleTitle,
        string unitName,
        string setPasswordUrl)
    {
        var subject = $"You're invited to KairosPayHub — {churchName}";
        var body = $"""
            Hi {leaderName},

            You've been added as {roleTitle} for {unitName} at {churchName}.

            Set your password to get started:
            {setPasswordUrl}

            This link expires in 7 days. After you set your password, sign in with your email address.

            — KairosPayHub
            """;

        return (subject, body);
    }
}
