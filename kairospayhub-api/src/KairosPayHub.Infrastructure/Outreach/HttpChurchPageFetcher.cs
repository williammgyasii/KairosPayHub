namespace KairosPayHub.Api.Outreach;

public class HttpChurchPageFetcher(HttpClient http) : IChurchPageFetcher
{
    public async Task<ChurchPages> FetchAsync(string website, CancellationToken ct)
    {
        var root = Root(website);
        var home = await TryGet(root, ct);
        string? contact = null;
        string? contactUrl = null;
        foreach (var path in new[] { "/contact/", "/contact", "/contact-us/", "/contact-us" })
        {
            var url = root.TrimEnd('/') + path;
            var html = await TryGet(url, ct);
            if (html is null) continue;
            contact = html;
            contactUrl = url;
            if (PublishedEmailReader.FromHtml(html, PublishedEmailReader.HostOf(website)) is not null)
                break;
        }

        return new ChurchPages(contact, home, contactUrl);
    }

    private async Task<string?> TryGet(string url, CancellationToken ct)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation(
                "User-Agent",
                "Mozilla/5.0 (compatible; KairosPayHubOutreach/1.0)");
            request.Headers.TryAddWithoutValidation("Accept", "text/html");
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadAsStringAsync(ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (TaskCanceledException)
        {
            return null;
        }
    }

    private static string Root(string website)
    {
        var value = website.Contains("://", StringComparison.Ordinal) ? website : "https://" + website;
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            value = "https://" + value["http://".Length..];
        var uri = new Uri(value);
        return uri.GetLeftPart(UriPartial.Authority);
    }
}
