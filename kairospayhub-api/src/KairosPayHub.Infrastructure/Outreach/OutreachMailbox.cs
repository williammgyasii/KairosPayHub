using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace KairosPayHub.Api.Outreach;

public interface IOutreachMailbox
{
    Task SendAsync(string toEmail, string subject, string body, CancellationToken ct);
}

public class OutreachMailbox(IOptions<OutreachOptions> options, IHostEnvironment environment) : IOutreachMailbox
{
    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct)
    {
        var cfg = options.Value;
        if (string.IsNullOrWhiteSpace(cfg.Smtp.Host) || string.IsNullOrWhiteSpace(cfg.Smtp.Password))
            throw new InvalidOperationException("Outreach mailbox is not configured.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(cfg.FromName, cfg.FromAddress));
        message.ReplyTo.Add(MailboxAddress.Parse(cfg.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        if (environment.IsDevelopment())
            client.CheckCertificateRevocation = false;

        await client.ConnectAsync(cfg.Smtp.Host, cfg.Smtp.Port, SecureSocketOptions.StartTls, ct);
        await client.AuthenticateAsync(cfg.Smtp.Username, cfg.Smtp.Password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
