namespace KairosPayHub.Api.Email;

public class EmailOptions
{
    public const string SectionName = "Email";

    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public string FromAddress { get; set; } = "noreply@localhost";
    public string FromName { get; set; } = "KairosPayHub";
    public SmtpOptions Smtp { get; set; } = new();
}

public class SmtpOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool UseTls { get; set; } = true;
}
