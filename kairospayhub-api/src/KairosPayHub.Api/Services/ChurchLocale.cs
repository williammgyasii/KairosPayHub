namespace KairosPayHub.Api.Services;

public sealed record SupportedCountry(string Code, string Name, string Currency);

public static class ChurchLocale
{
    private static readonly SupportedCountry[] Countries =
    [
        new("GH", "Ghana", "GHS"),
        new("US", "United States", "USD"),
        new("CA", "Canada", "CAD"),
        new("GB", "United Kingdom", "GBP"),
        new("NG", "Nigeria", "NGN"),
        new("KE", "Kenya", "KES"),
        new("ZA", "South Africa", "ZAR"),
        new("AU", "Australia", "AUD"),
        new("JM", "Jamaica", "JMD"),
        new("LR", "Liberia", "LRD"),
        new("SL", "Sierra Leone", "SLE"),
        new("CI", "Côte d'Ivoire", "XOF"),
        new("SN", "Senegal", "XOF"),
        new("DE", "Germany", "EUR"),
        new("FR", "France", "EUR"),
        new("NL", "Netherlands", "EUR"),
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
}
