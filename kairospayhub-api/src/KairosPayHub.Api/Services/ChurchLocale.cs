namespace KairosPayHub.Api.Services;

public sealed record SupportedCountry(string Code, string Name, string Currency, string TimeZoneId);

public static class ChurchLocale
{
    private static readonly SupportedCountry[] Countries =
    [
        new("GH", "Ghana", "GHS", "Africa/Accra"),
        new("US", "United States", "USD", "America/New_York"),
        new("CA", "Canada", "CAD", "America/Toronto"),
        new("GB", "United Kingdom", "GBP", "Europe/London"),
        new("NG", "Nigeria", "NGN", "Africa/Lagos"),
        new("KE", "Kenya", "KES", "Africa/Nairobi"),
        new("ZA", "South Africa", "ZAR", "Africa/Johannesburg"),
        new("AU", "Australia", "AUD", "Australia/Sydney"),
        new("JM", "Jamaica", "JMD", "America/Jamaica"),
        new("LR", "Liberia", "LRD", "Africa/Monrovia"),
        new("SL", "Sierra Leone", "SLE", "Africa/Freetown"),
        new("CI", "Côte d'Ivoire", "XOF", "Africa/Abidjan"),
        new("SN", "Senegal", "XOF", "Africa/Dakar"),
        new("DE", "Germany", "EUR", "Europe/Berlin"),
        new("FR", "France", "EUR", "Europe/Paris"),
        new("NL", "Netherlands", "EUR", "Europe/Amsterdam"),
    ];

    private static readonly Dictionary<string, SupportedCountry> ByCode =
        Countries.ToDictionary(c => c.Code, StringComparer.OrdinalIgnoreCase);

    public static IReadOnlyList<SupportedCountry> ListSupported() => Countries;

    public static bool TryResolve(string? countryCode, out SupportedCountry country)
    {
        country = default!;
        if (string.IsNullOrWhiteSpace(countryCode))
            return false;

        return ByCode.TryGetValue(countryCode.Trim().ToUpperInvariant(), out country!);
    }

    public static SupportedCountry ResolveOrThrow(string? countryCode)
    {
        if (!TryResolve(countryCode, out var country))
            throw new ArgumentException("Country is not supported or missing");

        return country;
    }

    public static string DefaultTimeZoneId(string? countryCode) =>
        TryResolve(countryCode, out var country) ? country.TimeZoneId : "UTC";
}
