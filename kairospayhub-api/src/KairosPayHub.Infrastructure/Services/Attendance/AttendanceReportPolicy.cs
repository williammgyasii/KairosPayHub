using System.Text.Json;
using KairosPayHub.Api.Domain;

namespace KairosPayHub.Api.Services;

public record AttendanceReportFieldDto(string Id, string Kind, string Label, bool Required);

public record AttendanceReportDocumentDto(
    IReadOnlyList<AttendanceReportFieldDto> Schema,
    Dictionary<string, JsonElement> Answers);

/// <summary>
/// Pure report schema + completeness rules. What changes: prompts and required flags.
/// What stays: mark → (optional report) → submit.
/// </summary>
public static class AttendanceReportPolicy
{
    public const int MaxPhotosPerPrompt = 5;

    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
    };

    public static IReadOnlyList<AttendanceReportFieldDto> DefaultSchema { get; } =
    [
        new("taught", "longText", "What was taught", true),
        new("shared", "longText", "What was shared", true),
        new("prayer", "longText", "Prayer / follow-up", false),
        new("photos", "photos", "Photos", true),
    ];

    public static (bool RequiresReport, string SchemaJson) NormalizeSchema(
        bool requiresReport,
        IReadOnlyList<AttendanceReportFieldDto>? schema)
    {
        if (!requiresReport)
            return (false, "[]");

        var fields = schema is { Count: > 0 } ? schema : DefaultSchema;
        return (true, SerializeSchema(ValidateSchema(fields)));
    }

    public static IReadOnlyList<AttendanceReportFieldDto> ParseSchema(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json.Trim() == "[]")
            return [];

        var parsed = JsonSerializer.Deserialize<List<AttendanceReportFieldDto>>(json, JsonOptions);
        return parsed is null ? [] : ValidateSchema(parsed);
    }

    public static IReadOnlyList<AttendanceReportFieldDto> SchemaForType(
        bool requiresReport,
        string? schemaJson)
    {
        if (!requiresReport)
            return [];
        var parsed = ParseSchema(schemaJson);
        return parsed.Count > 0 ? parsed : DefaultSchema;
    }

    public static bool IsComplete(
        IReadOnlyList<AttendanceReportFieldDto> schema,
        IReadOnlyDictionary<string, JsonElement>? answers)
    {
        foreach (var field in schema.Where(f => f.Required))
        {
            if (answers is null || !answers.TryGetValue(field.Id, out var value))
                return false;
            if (!FieldHasAnswer(field, value))
                return false;
        }

        return true;
    }

    public static string SerializeSchema(IReadOnlyList<AttendanceReportFieldDto> schema) =>
        JsonSerializer.Serialize(schema, JsonOptions);

    public static string SerializeDocument(AttendanceReportDocumentDto document) =>
        JsonSerializer.Serialize(document, JsonOptions);

    public static AttendanceReportDocumentDto? ParseDocument(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;
        return JsonSerializer.Deserialize<AttendanceReportDocumentDto>(json, JsonOptions);
    }

    public static Dictionary<string, JsonElement> NormalizeAnswers(
        IReadOnlyList<AttendanceReportFieldDto> schema,
        IReadOnlyDictionary<string, JsonElement>? answers)
    {
        var normalized = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        if (answers is null)
            return normalized;

        foreach (var field in schema)
        {
            if (!answers.TryGetValue(field.Id, out var value))
                continue;
            if (field.Kind == "photos")
            {
                var urls = ReadPhotoUrls(value);
                if (urls.Count > MaxPhotosPerPrompt)
                    throw new BadRequestException("A photos prompt can have at most 5 images");
                normalized[field.Id] = JsonSerializer.SerializeToElement(urls, JsonOptions);
            }
            else if (value.ValueKind == JsonValueKind.String)
            {
                normalized[field.Id] = value;
            }
        }

        return normalized;
    }

    public static bool FieldHasAnswer(AttendanceReportFieldDto field, JsonElement value)
    {
        if (field.Kind == "photos")
            return ReadPhotoUrls(value).Count > 0;
        return value.ValueKind == JsonValueKind.String && value.GetString()?.Trim().Length > 0;
    }

    public static IReadOnlyList<AttendanceReportFieldDto> ValidateSchema(
        IReadOnlyList<AttendanceReportFieldDto> schema)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var fields = new List<AttendanceReportFieldDto>(schema.Count);
        var index = 0;
        foreach (var raw in schema)
        {
            var kind = raw.Kind?.Trim() ?? string.Empty;
            if (kind is not ("longText" or "photos"))
                throw new BadRequestException("Report prompts must be long text or photos");

            var label = raw.Label?.Trim() ?? string.Empty;
            if (label.Length == 0)
                throw new BadRequestException("Each report prompt needs a label");

            var id = string.IsNullOrWhiteSpace(raw.Id) ? $"field-{++index}" : raw.Id.Trim();
            if (!seen.Add(id))
                throw new BadRequestException("Report prompt ids must be unique");

            fields.Add(new AttendanceReportFieldDto(id, kind, label, raw.Required));
        }

        return fields;
    }

    private static List<string> ReadPhotoUrls(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Array)
            return [];
        return value.EnumerateArray()
            .Select(item => item.ValueKind == JsonValueKind.String ? item.GetString() : null)
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Select(url => url!.Trim())
            .ToList();
    }
}
