using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Outreach;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Outreach;

public interface IOutreachDraftWriter
{
    Task<OutreachDraft> WriteAsync(OutreachChurch church, CancellationToken ct, string? instruction = null, string? subject = null, string? body = null);
}

public sealed record OutreachDraft(string Subject, string Body);

public class OutreachDraftWriter(HttpClient http, IOptions<OutreachOptions> options) : IOutreachDraftWriter
{
    public async Task<OutreachDraft> WriteAsync(
        OutreachChurch church,
        CancellationToken ct,
        string? instruction = null,
        string? subject = null,
        string? body = null)
    {
        var key = options.Value.OpenAiApiKey;
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Outreach draft writer is not configured.");

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        request.Content = JsonContent.Create(new
        {
            model = "gpt-4o-mini",
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = """
                        Write a thoughtful pilot invitation from William at KairosPayHub to one church. Return JSON with subject and body. No placeholders like [Your Name]. This is plain-text email: never use Markdown, asterisks, hashes, or bold syntax. Format feature lines with the Unicode bullet "•", followed by a plain label and an em dash.

                        The email explains the product and invites the church to become an early pilot partner. It must feel personal and useful, not like mass marketing. Do not apologize for writing. Do not claim the product is free. Do not use urgency, hype, slogans, or language such as "limited offer." Do not open with a Bible verse.

                        Order:
                        1. Greet the church by name and introduce William as the person building KairosPayHub.
                        2. Explain that KairosPayHub brings the church's people, giving, attendance, events, and service media into one connected workspace. Emphasize that leaders get a clearer picture without moving between spreadsheets and disconnected tools.
                        3. Present these concrete strengths as four concise plain-text bullets. Each bullet must explain the practical outcome, not merely name a feature. Use exactly this visual pattern: "• Giving — ...".
                           • Giving — create giving campaigns, record individual contributions, review transactions, and understand overall giving across the church.
                           • Attendance — define the meetings the church actually holds, let leaders submit attendance, approve submissions, and review participation metrics.
                           • People and structure — organize members around the church's real structure—such as fellowships, ministries, or cells—while keeping membership records together.
                           • Church life — publish events and keep service recordings accessible from the same church workspace.
                        4. Explain that KairosPayHub is entering a pilot phase with a small group of churches. Pilot churches will receive personal help getting started and can share feedback that shapes the product around real church operations. Do not invent pricing, dates, or benefits not stated here.
                        5. Invite them to reply directly to this message or email william@kairospayhub.com if the pilot sounds useful and they would like William to help them get started.
                        6. After the invitation, include one short, accurately quoted Bible verse with its reference as a blessing. Then sign off on separate lines as:
                           William
                           KairosPayHub

                        Use the city naturally when it is known. About 260 to 340 words. Warm, confident, concrete, and unhurried.
                        """,
                },
                new
                {
                    role = "user",
                    content = string.IsNullOrWhiteSpace(instruction)
                        ? $"Church: {church.Name}. City: {church.City}. State: {church.State}."
                        : $"Revise this email. Instruction: {instruction.Trim()}\nSubject: {subject}\nBody: {body}",
                },
            },
        });

        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var failure = await response.Content.ReadAsStringAsync(ct);
            var reason = "A draft could not be written.";
            try
            {
                var error = JsonSerializer.Deserialize<JsonElement>(failure);
                if (error.TryGetProperty("error", out var errorBody) && errorBody.TryGetProperty("message", out var message))
                    reason = message.GetString() ?? reason;
            }
            catch (JsonException)
            {
            }

            throw new InvalidOperationException(reason);
        }
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        var text = payload.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? throw new InvalidOperationException("The draft came back empty.");
        var draft = JsonSerializer.Deserialize<DraftJson>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("The draft came back empty.");
        if (string.IsNullOrWhiteSpace(draft.Subject) || string.IsNullOrWhiteSpace(draft.Body))
            throw new InvalidOperationException("The draft came back empty.");
        return new OutreachDraft(draft.Subject.Trim(), draft.Body.Trim());
    }

    private sealed record DraftJson(string? Subject, string? Body);
}
