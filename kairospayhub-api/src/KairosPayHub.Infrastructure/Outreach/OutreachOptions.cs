namespace KairosPayHub.Api.Outreach;

public class OutreachOptions
{
    public const string SectionName = "Outreach";

    public string[] OperatorEmails { get; set; } = ["william@kairospayhub.com"];

    public string OpenPlacesApiKey { get; set; } = "";

    public string OpenAiApiKey { get; set; } = "";

    public double RadiusMiles { get; set; } = 25;

    public int MaxWebsitesPerSearch { get; set; } = 20;

    public string FromAddress { get; set; } = "william@kairospayhub.com";

    public string FromName { get; set; } = "KairosPayHub";

    public OutreachSmtpOptions Smtp { get; set; } = new();
}

public class OutreachSmtpOptions
{
    public string Host { get; set; } = "";

    public int Port { get; set; } = 587;

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";
}

public static class OutreachOperator
{
    public static bool IsAllowed(string? email, OutreachOptions options) =>
        !string.IsNullOrWhiteSpace(email)
        && options.OperatorEmails.Any(allowed =>
            string.Equals(allowed.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase));
}
