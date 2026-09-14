namespace KairosPayHub.Api.FeatureFlags;

public static class ServiceRecordingFeaturePolicy
{
    public static bool IsEnabled(ServiceRecordingsFeatureOptions options, Guid? churchId)
    {
        if (options.Enabled)
            return true;

        if (churchId is null || churchId == Guid.Empty)
            return false;

        return ParseAllowlist(options.AllowedChurchIds).Contains(churchId.Value);
    }

    public static IReadOnlySet<Guid> ParseAllowlist(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return new HashSet<Guid>();

        var ids = new HashSet<Guid>();
        foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Guid.TryParse(part, out var id))
                ids.Add(id);
        }

        return ids;
    }
}
