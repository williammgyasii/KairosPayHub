using System.Text.Json;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Account;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class UserTablePreferenceService(KairosDbContext db)
{
    public static readonly IReadOnlySet<string> AllowedKeys = new HashSet<string>(StringComparer.Ordinal)
    {
        "columns.roster.units",
        "columns.roster.membership",
        "columns.attendance.who-showed-up",
        "columns.giving.overall",
        "columns.giving.campaign",
    };

    static readonly IReadOnlySet<string> AlwaysOnColumns = new HashSet<string>(StringComparer.Ordinal)
    {
        "name",
        "member",
        "actions",
    };

    public async Task<Dictionary<string, Dictionary<string, bool>>> ListAsync(
        Guid authUserId,
        CancellationToken ct)
    {
        var rows = await db.UserTablePreferences.AsNoTracking()
            .Where(row => row.AuthUserId == authUserId)
            .ToListAsync(ct);

        var maps = new Dictionary<string, Dictionary<string, bool>>(StringComparer.Ordinal);
        foreach (var row in rows)
            maps[row.Key] = Deserialize(row.ColumnsJson);
        return maps;
    }

    public async Task<Dictionary<string, bool>> UpsertAsync(
        Guid authUserId,
        string key,
        IReadOnlyDictionary<string, bool>? columns,
        CancellationToken ct)
    {
        if (!AllowedKeys.Contains(key))
            throw new BadRequestException("Unknown table preference key");

        var sanitized = Sanitize(columns);
        var json = JsonSerializer.Serialize(sanitized);

        var existing = await db.UserTablePreferences
            .SingleOrDefaultAsync(row => row.AuthUserId == authUserId && row.Key == key, ct);
        if (existing is null)
        {
            db.UserTablePreferences.Add(new UserTablePreference
            {
                AuthUserId = authUserId,
                Key = key,
                ColumnsJson = json,
            });
        }
        else
        {
            existing.ColumnsJson = json;
        }

        await db.SaveChangesAsync(ct);
        return sanitized;
    }

    static Dictionary<string, bool> Sanitize(IReadOnlyDictionary<string, bool>? columns)
    {
        var map = new Dictionary<string, bool>(StringComparer.Ordinal);
        if (columns is not null)
        {
            foreach (var (id, visible) in columns)
            {
                if (string.IsNullOrWhiteSpace(id)) continue;
                map[id] = AlwaysOnColumns.Contains(id) || visible;
            }
        }

        return map;
    }

    static Dictionary<string, bool> Deserialize(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, bool>>(json)
                ?? new Dictionary<string, bool>(StringComparer.Ordinal);
        }
        catch (JsonException)
        {
            return new Dictionary<string, bool>(StringComparer.Ordinal);
        }
    }
}
