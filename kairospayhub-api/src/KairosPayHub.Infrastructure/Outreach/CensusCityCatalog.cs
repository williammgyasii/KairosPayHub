using System.Net;
using System.Text.Json;

namespace KairosPayHub.Api.Outreach;

public class CensusCityCatalog(HttpClient http) : ICityCatalog
{
    private const string Places =
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query";

    public async Task<IReadOnlyList<string>> ListAsync(string stateFips, CancellationToken ct)
    {
        var url = Places
            + "?where=" + WebUtility.UrlEncode($"STATE='{stateFips}'")
            + "&outFields=BASENAME&returnGeometry=false&orderByFields=BASENAME&resultRecordCount=2000&f=json";
        using var response = await http.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("features", out var features)) return [];

        var names = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var feature in features.EnumerateArray())
        {
            if (!feature.TryGetProperty("attributes", out var attributes)) continue;
            if (!attributes.TryGetProperty("BASENAME", out var name)) continue;
            var city = name.GetString()?.Trim();
            if (!string.IsNullOrEmpty(city)) names.Add(city);
        }

        return names.ToList();
    }
}
