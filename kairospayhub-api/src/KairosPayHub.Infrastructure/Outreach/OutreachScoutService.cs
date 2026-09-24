using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Outreach;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Outreach;

public class OutreachAreaNotFoundException : Exception;

public class OutreachScoutService(
    KairosDbContext db,
    IAreaGeocoder geocoder,
    IChurchPlaceSearch places,
    IChurchPageFetcher pages,
    IOptions<OutreachOptions> options)
{
    public async Task<IReadOnlyList<OutreachChurch>> SearchAsync(string area, CancellationToken ct, double radiusMiles = 0)
    {
        var radius = radiusMiles > 0 ? radiusMiles : options.Value.RadiusMiles;
        var (city, state) = SplitArea(area);
        if (city is not null && state is not null)
        {
            var cached = await db.OutreachAreaCaches.AnyAsync(
                row => row.City == city && row.State == state && row.RadiusMiles == radius,
                ct);
            if (cached)
            {
                return await db.OutreachChurches
                    .Where(row => row.City == city && row.State == state && row.RadiusMiles == radius)
                    .OrderBy(row => row.Name)
                    .ToListAsync(ct);
            }
        }

        var point = await geocoder.LocateAsync(area, ct) ?? throw new OutreachAreaNotFoundException();
        var found = await places.SearchAsync(point.Lat, point.Lon, radius, ct);
        var withSites = found
            .Where(place => !string.IsNullOrWhiteSpace(place.Website) && !string.IsNullOrWhiteSpace(place.PlaceId))
            .Take(options.Value.MaxWebsitesPerSearch)
            .ToList();

        var fetched = new ChurchPages?[withSites.Count];
        await Parallel.ForEachAsync(
            withSites.Select((place, index) => (place, index)),
            new ParallelOptions { MaxDegreeOfParallelism = 6, CancellationToken = ct },
            async (item, token) =>
            {
                try
                {
                    fetched[item.index] = await pages.FetchAsync(item.place.Website!, token);
                }
                catch (HttpRequestException)
                {
                    fetched[item.index] = null;
                }
            });

        var sendable = new List<OutreachChurch>();
        var now = DateTimeOffset.UtcNow;
        for (var i = 0; i < withSites.Count; i++)
        {
            var place = withSites[i];
            var html = fetched[i];
            if (html is null) continue;
            var email = PublishedEmailReader.Choose(html.ContactHtml, html.HomeHtml, place.Website!);
            if (email is null) continue;

            var row = await db.OutreachChurches.FirstOrDefaultAsync(c => c.PlaceId == place.PlaceId, ct);
            if (row is null)
            {
                row = new OutreachChurch { PlaceId = place.PlaceId, CreatedAt = now, Saved = false };
                db.OutreachChurches.Add(row);
            }

            row.Name = place.Name;
            row.Address = place.Address;
            row.City = city;
            row.State = state;
            row.RadiusMiles = radius;
            row.Website = place.Website!;
            row.Email = email;
            row.EmailSourceUrl = html.ContactUrl ?? place.Website;
            row.UpdatedAt = now;
            sendable.Add(row);
        }

        await db.SaveChangesAsync(ct);
        if (city is not null && state is not null)
        {
            db.OutreachAreaCaches.Add(new OutreachAreaCache
            {
                City = city,
                State = state,
                RadiusMiles = radius,
                SearchedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync(ct);
        }

        return sendable;
    }

    private static (string? City, string? State) SplitArea(string area)
    {
        var comma = area.LastIndexOf(',');
        if (comma <= 0 || comma == area.Length - 1) return (null, null);
        var city = area[..comma].Trim();
        var state = area[(comma + 1)..].Trim();
        return (city.Length == 0 ? null : city, state.Length == 0 ? null : state);
    }
}
