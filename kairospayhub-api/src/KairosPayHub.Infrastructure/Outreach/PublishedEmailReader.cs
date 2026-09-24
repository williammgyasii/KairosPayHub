using System.Net;
using System.Text.RegularExpressions;

namespace KairosPayHub.Api.Outreach;

/// <summary>
/// Reads a published address from church-site HTML. The Madison Christian
/// contact page stores the address as HTML character references, so the
/// page is decoded before the search.
/// </summary>
public static partial class PublishedEmailReader
{
    private static readonly string[] IgnoredHosts =
    [
        "example.com", "email.com", "domain.com", "sentry.io", "wixpress.com",
        "schema.org", "google.com", "gstatic.com", "wordpress.com", "godaddy.com",
        "events.frontend",
    ];

    public static string? Choose(string? contactHtml, string? homeHtml, string churchWebsite)
    {
        var host = HostOf(churchWebsite);
        return FromHtml(contactHtml, host) ?? FromHtml(homeHtml, host);
    }

    public static string? FromHtml(string? html, string churchHost)
    {
        if (string.IsNullOrWhiteSpace(html)) return null;
        var decoded = WebUtility.HtmlDecode(html);
        var found = new List<string>();
        foreach (Match match in EmailPattern().Matches(decoded))
        {
            var email = match.Value.Trim('.', ')', '>', ',', ';').ToLowerInvariant();
            if (!IsUsable(email) || found.Contains(email)) continue;
            found.Add(email);
        }

        if (found.Count == 0) return null;
        return found.FirstOrDefault(email => SameHost(HostOfEmail(email), churchHost)) ?? found[0];
    }

    private static bool IsUsable(string email)
    {
        var host = HostOfEmail(email);
        if (host.Length == 0 || !host.Contains('.')) return false;
        if (IgnoredHosts.Any(ignored => host == ignored || host.EndsWith("." + ignored, StringComparison.Ordinal)))
            return false;
        var tld = host.Split('.')[^1];
        return tld is not ("png" or "jpg" or "jpeg" or "gif" or "svg" or "css" or "js" or "webp");
    }

    private static bool SameHost(string emailHost, string churchHost) =>
        emailHost == churchHost || emailHost.EndsWith("." + churchHost, StringComparison.Ordinal);

    internal static string HostOf(string website)
    {
        var value = website.Contains("://", StringComparison.Ordinal) ? website : "https://" + website;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return "";
        var host = uri.Host.ToLowerInvariant();
        return host.StartsWith("www.", StringComparison.Ordinal) ? host[4..] : host;
    }

    private static string HostOfEmail(string email)
    {
        var at = email.LastIndexOf('@');
        return at < 0 ? "" : email[(at + 1)..];
    }

    [GeneratedRegex(@"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", RegexOptions.IgnoreCase)]
    private static partial Regex EmailPattern();
}
