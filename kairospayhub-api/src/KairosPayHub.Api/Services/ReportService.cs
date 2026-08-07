using System.Globalization;
using System.Text;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class ReportService(KairosDbContext db, RecordService records)
{
    private static readonly string[] Header =
    [
        "Date Sent", "Church", "Submitted By", "Amount", "Currency",
        "Method", "Reference", "Status", "Verified By", "Verified At",
    ];

    public async Task<string> ExportCsvAsync(
        Actor actor,
        RecordFilters? filters = null,
        CancellationToken ct = default)
    {
        var rows = await records.ListAsync(actor, filters, ct);

        var churchNames = await db.Churches
            .Where(c => c.OrganizationId == actor.OrganizationId)
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);
        var userNames = await db.AppUsers
            .Where(u => u.OrganizationId == actor.OrganizationId)
            .ToDictionaryAsync(u => u.Id, u => u.Name, ct);

        var sb = new StringBuilder();
        sb.Append(string.Join(",", Header)).Append("\r\n");

        foreach (var r in rows)
        {
            var line = new[]
            {
                r.DateSent.ToString("o", CultureInfo.InvariantCulture),
                churchNames.GetValueOrDefault(r.ChurchId, ""),
                userNames.GetValueOrDefault(r.SubmittedById, ""),
                r.Amount.ToString(CultureInfo.InvariantCulture),
                r.Currency,
                r.Method.ToString(),
                r.Reference ?? "",
                r.Status.ToString(),
                r.VerifiedById is { } vid ? userNames.GetValueOrDefault(vid, "") : "",
                r.VerifiedAt?.ToString("o", CultureInfo.InvariantCulture) ?? "",
            };
            sb.Append(string.Join(",", line.Select(Escape))).Append("\r\n");
        }

        return sb.ToString();
    }

    private static string Escape(string value) =>
        value.IndexOfAny(['"', ',', '\r', '\n']) >= 0
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
