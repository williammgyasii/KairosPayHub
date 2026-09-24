namespace KairosPayHub.Api.Outreach;

public sealed record ChurchPlace(string PlaceId, string Name, string? Address, string? Website);

public sealed record ChurchPages(string? ContactHtml, string? HomeHtml, string? ContactUrl);

public sealed record GeoPoint(double Lat, double Lon);

public interface IAreaGeocoder
{
    Task<GeoPoint?> LocateAsync(string area, CancellationToken ct);
}

public sealed record LocatedPlace(string State, string City);

public interface ILocationGeocoder
{
    Task<LocatedPlace?> LocateAsync(double latitude, double longitude, CancellationToken ct);
}

public interface ICityCatalog
{
    Task<IReadOnlyList<string>> ListAsync(string stateFips, CancellationToken ct);
}

public interface IChurchPlaceSearch
{
    Task<IReadOnlyList<ChurchPlace>> SearchAsync(double lat, double lon, double radiusMiles, CancellationToken ct);
}

public interface IChurchPageFetcher
{
    Task<ChurchPages> FetchAsync(string website, CancellationToken ct);
}
