using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace KairosPayHub.Api.Outreach;

public class CensusAreaGeocoder(HttpClient http) : IAreaGeocoder
{
    private const string Places =
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query";

    private const string Zips =
        "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/11/query";

    private static readonly Regex Zip = new(@"^\d{5}$", RegexOptions.CultureInvariant);

    public async Task<GeoPoint?> LocateAsync(string area, CancellationToken ct)
    {
        var trimmed = area.Trim();
        if (Zip.IsMatch(trimmed))
            return await QueryAsync(Zips, $"ZCTA5='{trimmed}'", ct);

        var comma = trimmed.LastIndexOf(',');
        if (comma <= 0 || comma == trimmed.Length - 1) return null;
        var city = trimmed[..comma].Trim();
        var state = trimmed[(comma + 1)..].Trim();
        if (city.Length == 0 || !CensusStateCodes.TryGetFips(state, out var fips)) return null;
        if (city.Any(ch => ch is not (>= 'A' and <= 'Z' or >= 'a' and <= 'z' or ' ' or '-' or '\'' or '.')))
            return null;

        return await QueryAsync(Places, $"BASENAME='{city.Replace("'", "''", StringComparison.Ordinal)}' AND STATE='{fips}'", ct);
    }

    private async Task<GeoPoint?> QueryAsync(string layer, string where, CancellationToken ct)
    {
        var url = layer
            + "?where=" + WebUtility.UrlEncode(where)
            + "&outFields=INTPTLAT,INTPTLON&returnGeometry=false&f=json";
        using var response = await http.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("features", out var features)
            || features.GetArrayLength() == 0)
            return null;

        var attributes = features[0].GetProperty("attributes");
        var lat = double.Parse(attributes.GetProperty("INTPTLAT").GetString()!, CultureInfo.InvariantCulture);
        var lon = double.Parse(attributes.GetProperty("INTPTLON").GetString()!, CultureInfo.InvariantCulture);
        return new GeoPoint(lat, lon);
    }
}
