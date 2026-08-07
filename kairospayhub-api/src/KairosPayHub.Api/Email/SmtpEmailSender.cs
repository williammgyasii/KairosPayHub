using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace KairosPayHub.Api.Email;

public class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        var cfg = options.Value;
        if (string.IsNullOrWhiteSpace(cfg.Smtp.Host))
            throw new InvalidOperationException("Email:Smtp:Host is not configured");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(cfg.FromName, cfg.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        await client.ConnectAsync(cfg.Smtp.Host, cfg.Smtp.Port,
            cfg.Smtp.UseTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None, ct);

        if (!string.IsNullOrEmpty(cfg.Smtp.Username))
            await client.AuthenticateAsync(cfg.Smtp.Username, cfg.Smtp.Password, ct);

        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
