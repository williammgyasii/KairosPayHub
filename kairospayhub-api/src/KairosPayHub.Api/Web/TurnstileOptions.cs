namespace KairosPayHub.Api.Web;

public class TurnstileOptions
{
    public const string SectionName = "Turnstile";

    public string? Secret { get; set; }

    /// <summary>Comma-separated hostnames returned by siteverify (e.g. app.kairospayhub.com,127.0.0.1).</summary>
    public string AllowedHostnames { get; set; } = "";
}
