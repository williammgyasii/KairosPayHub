using System.Globalization;
using System.Text.Json;

namespace KairosPayHub.Api.Outreach;

public class CensusLocationGeocoder(HttpClient http) : ILocationGeocoder
{
    public async Task<LocatedPlace?> LocateAsync(double latitude, double longitude, CancellationToken ct)
    {
        var url =
            "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
            + "?x=" + longitude.ToString(CultureInfo.InvariantCulture)
            + "&y=" + latitude.ToString(CultureInfo.InvariantCulture)
            + "&benchmark=Public_AR_Current&vintage=Current_Current&format=json";
        using var response = await http.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("result", out var result)
            || !result.TryGetProperty("geographies", out var geographies))
            return null;

        var state = Abbreviation(geographies, "States");
        var city = Name(geographies, "Incorporated Places") ?? Name(geographies, "Census Designated Places");
        if (state is null || city is null) return null;
        return new LocatedPlace(state, city);
    }

    private static string? Abbreviation(JsonElement geographies, string layer)
    {
        if (!geographies.TryGetProperty(layer, out var rows) || rows.GetArrayLength() == 0) return null;
        return rows[0].TryGetProperty("STUSAB", out var code) ? code.GetString() : null;
    }

    private static string? Name(JsonElement geographies, string layer)
    {
        if (!geographies.TryGetProperty(layer, out var rows) || rows.GetArrayLength() == 0) return null;
        return rows[0].TryGetProperty("BASENAME", out var name) ? name.GetString() : null;
    }
}
