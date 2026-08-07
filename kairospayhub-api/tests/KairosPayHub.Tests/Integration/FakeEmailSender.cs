using KairosPayHub.Api.Email;

namespace KairosPayHub.Tests.Integration;

public sealed class FakeEmailSender : IEmailSender
{
    public string? LastTo { get; private set; }
    public string? LastSubject { get; private set; }
    public string? LastBody { get; private set; }
    public IReadOnlyList<(string To, string Subject, string Body)> Sent => _sent;
    private readonly List<(string, string, string)> _sent = [];

    public Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        LastTo = toEmail;
        LastSubject = subject;
        LastBody = body;
        _sent.Add((toEmail, subject, body));
        return Task.CompletedTask;
    }

    public void Clear()
    {
        LastTo = LastSubject = LastBody = null;
        _sent.Clear();
    }

    public string? ExtractConfirmationCode() =>
        LastBody is null ? null : System.Text.RegularExpressions.Regex.Match(LastBody, @"\b(\d{6})\b").Groups[1].Value;
}
