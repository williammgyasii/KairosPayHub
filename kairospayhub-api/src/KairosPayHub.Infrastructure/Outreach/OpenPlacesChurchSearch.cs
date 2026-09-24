using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Outreach;

public class OpenPlacesChurchSearch(HttpClient http, IOptions<OutreachOptions> options) : IChurchPlaceSearch
{
    public const string Category = "christian_place_of_worship";

    public async Task<IReadOnlyList<ChurchPlace>> SearchAsync(
        double lat, double lon, double radiusMiles, CancellationToken ct)
    {
        var key = options.Value.OpenPlacesApiKey;
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Outreach:OpenPlacesApiKey is not configured");

        var places = new List<ChurchPlace>();
        var offset = 0;
        while (places.Count < options.Value.MaxWebsitesPerSearch)
        {
            var limit = Math.Min(50, options.Value.MaxWebsitesPerSearch - places.Count);
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://api.openplacesapi.com/v1/places?category={Category}&lat={lat}&lon={lon}&radius_mi={radiusMiles}&limit={limit}&offset={offset}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
            using var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (doc.RootElement.TryGetProperty("results", out var results))
            {
                foreach (var row in results.EnumerateArray())
                    places.Add(ReadPlace(row));
            }

            if (!doc.RootElement.TryGetProperty("meta", out var meta)
                || !meta.TryGetProperty("next_offset", out var next)
                || next.ValueKind != JsonValueKind.Number)
                break;
            offset = next.GetInt32();
        }

        return places;
    }

    private static ChurchPlace ReadPlace(JsonElement row)
    {
        string? address = null;
        if (row.TryGetProperty("address", out var addressNode)
            && addressNode.ValueKind == JsonValueKind.Object
            && addressNode.TryGetProperty("formatted", out var formatted))
            address = formatted.GetString();

        return new ChurchPlace(
            row.GetProperty("place_id").GetString() ?? "",
            row.GetProperty("name").GetString() ?? "",
            address,
            row.TryGetProperty("website", out var website) ? website.GetString() : null);
    }
}
