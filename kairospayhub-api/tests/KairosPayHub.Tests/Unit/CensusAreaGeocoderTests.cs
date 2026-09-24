using System.Net;
using KairosPayHub.Api.Outreach;

namespace KairosPayHub.Tests.Unit;

public class CensusAreaGeocoderTests
{
    [Fact]
    public async Task City_and_state_uses_the_census_place_not_a_street_address()
    {
        string? requestUri = null;
        var geocoder = new CensusAreaGeocoder(new HttpClient(new StubHandler(request =>
        {
            requestUri = request.RequestUri?.ToString();
            return Json("""
                {"features":[{"attributes":{"INTPTLAT":"+39.9873674","INTPTLON":"-082.9851797"}}]}
                """);
        })));

        var point = await geocoder.LocateAsync("Columbus, OH", CancellationToken.None);

        Assert.NotNull(point);
        Assert.Contains("Places_CouSub_ConCity_SubMCD", requestUri);
        Assert.Contains("BASENAME%3d%27Columbus%27", requestUri, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("STATE%3d%2739%27", requestUri, StringComparison.OrdinalIgnoreCase);
        Assert.InRange(point.Lat, 39.9, 40.1);
        Assert.InRange(point.Lon, -83.1, -82.8);
    }

    [Fact]
    public async Task Zip_code_uses_the_census_zip_layer()
    {
        string? requestUri = null;
        var geocoder = new CensusAreaGeocoder(new HttpClient(new StubHandler(request =>
        {
            requestUri = request.RequestUri?.ToString();
            return Json("""
                {"features":[{"attributes":{"INTPTLAT":"+39.9668908","INTPTLON":"-083.0132830"}}]}
                """);
        })));

        var point = await geocoder.LocateAsync("43215", CancellationToken.None);

        Assert.NotNull(point);
        Assert.Contains("ZCTA5%3d%2743215%27", requestUri, StringComparison.OrdinalIgnoreCase);
        Assert.InRange(point.Lat, 39.9, 40.0);
    }

    [Fact]
    public async Task Unknown_place_is_not_a_point()
    {
        var geocoder = new CensusAreaGeocoder(new HttpClient(new StubHandler(_ =>
            Json("""{"features":[]}"""))));

        var point = await geocoder.LocateAsync("NotARealPlace, OH", CancellationToken.None);

        Assert.Null(point);
    }

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body) };

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(respond(request));
    }
}
