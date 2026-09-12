namespace KairosPayHub.Api.Services;

/// <summary>
/// Pure pack rules. What changes: note, files, allowed kinds.
/// What stays: occurrence chrome and notify delivery.
/// </summary>
public static class AttendanceMeetingPackPolicy
{
    public const int MaxFiles = 5;
    public const int MaxFileBytes = 10 * 1024 * 1024;

    public static readonly HashSet<string> AllowedContentTypes =
    [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    public static bool IsComplete(string? note, int fileCount) =>
        !string.IsNullOrWhiteSpace(note) || fileCount > 0;

    public static bool FileAllowed(string? contentType) =>
        contentType is not null && AllowedContentTypes.Contains(contentType);

    public static string Fingerprint(string? note, IEnumerable<Guid> fileIds) =>
        $"{note?.Trim() ?? ""}|{string.Join(',', fileIds.OrderBy(id => id))}";
}
