using KairosPayHub.Api.Email;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Email;

/// <summary>
/// Sends via SMTP when configured; otherwise logs email content in Development
/// so password reset and confirmation flows work without MailHog.
/// </summary>
public sealed class LoggingEmailSender(
    ILogger<LoggingEmailSender> logger,
    IOptions<EmailOptions> options,
    IHostEnvironment environment,
    SmtpEmailSender smtp) : IEmailSender
{
    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        var host = options.Value.Smtp.Host;

        if (!string.IsNullOrWhiteSpace(host))
        {
            try
            {
                await smtp.SendAsync(toEmail, subject, body, ct);
                logger.LogInformation("Email sent to {To}: {Subject}", toEmail, subject);
                return;
            }
            catch (Exception ex) when (environment.IsDevelopment())
            {
                logger.LogWarning(ex, "SMTP send failed — falling back to console log");
            }
        }

        if (environment.IsDevelopment())
        {
            logger.LogInformation(
                """
                ========== DEV EMAIL ==========
                To: {To}
                Subject: {Subject}
                {Body}
                ===============================
                """,
                toEmail,
                subject,
                body);
            return;
        }

        throw new InvalidOperationException("Email:Smtp:Host is not configured");
    }
}
