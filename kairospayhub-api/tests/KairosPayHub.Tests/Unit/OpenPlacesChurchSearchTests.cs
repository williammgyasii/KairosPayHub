using System.Net;
using KairosPayHub.Api.Outreach;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Tests.Unit;

public class OpenPlacesChurchSearchTests
{
    [Fact]
    public async Task Asks_for_christian_places_of_worship_and_keeps_the_website()
    {
        string? requestUri = null;
        var handler = new StubHandler(request =>
        {
            requestUri = request.RequestUri?.ToString();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""
                    {
                      "results": [
                        {
                          "place_id": "overture:1",
                          "name": "Madison Christian Church",
                          "website": "https://www.madisonchristian.org/",
                          "address": { "formatted": "3565 Bixby Rd" }
                        },
                        {
                          "place_id": "overture:2",
                          "name": "No Site Chapel",
                          "address": { "formatted": "1 Main St" }
                        }
                      ],
                      "meta": { "next_offset": null }
                    }
                    """),
            };
        });
        var search = new OpenPlacesChurchSearch(
            new HttpClient(handler),
            Options.Create(new OutreachOptions { OpenPlacesApiKey = "test-key", MaxWebsitesPerSearch = 20 }));

        var places = await search.SearchAsync(39.96, -82.99, 25, CancellationToken.None);

        Assert.Contains("category=christian_place_of_worship", requestUri);
        Assert.Equal(2, places.Count);
        Assert.Equal("https://www.madisonchristian.org/", places[0].Website);
        Assert.Null(places[1].Website);
        Assert.Single(places, place => !string.IsNullOrWhiteSpace(place.Website));
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(respond(request));
    }
}
