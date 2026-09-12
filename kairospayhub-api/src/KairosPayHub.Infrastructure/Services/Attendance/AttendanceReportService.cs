using System.Text.Json;
using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Storage;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Upload + persist meeting reports. Completeness lives in <see cref="AttendanceReportPolicy"/>.
/// </summary>
public class AttendanceReportService(
    KairosDbContext db,
    AttendanceScopeService scope,
    AttendanceSubmissionSupport support,
    IObjectStorage storage)
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    private const int MaxBytes = 2 * 1024 * 1024;

    public async Task<string> UploadPhotoAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        Stream file,
        string contentType,
        long contentLength,
        bool pastorOverride,
        CancellationToken ct = default)
    {
        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();
        if (!AllowedTypes.Contains(contentType))
            throw new ArgumentException("Report photos must be JPEG, PNG, or WebP");
        if (contentLength <= 0 || contentLength > MaxBytes)
            throw new ArgumentException("Report photos must be between 1 byte and 2 MB");

        var (occurrence, submission) = await LoadEditableAsync(
            actor,
            authUserId,
            occurrenceId,
            scopeNodeId,
            pastorOverride,
            ct);

        var ext = contentType switch
        {
            "image/png" => "png",
            "image/webp" => "webp",
            _ => "jpg",
        };
        var key = $"churches/{occurrence.ChurchId}/attendance-reports/{submission.Id}/{Guid.NewGuid():N}.{ext}";
        return await storage.UploadAsync(key, file, contentType, ct);
    }

    public void SaveDraft(
        AttendanceMeetingType? meetingType,
        AttendanceScopeSubmission submission,
        IReadOnlyDictionary<string, JsonElement>? answers)
    {
        if (meetingType is null || !meetingType.RequiresReport)
        {
            submission.ReportPayload = null;
            return;
        }

        var schema = AttendanceReportPolicy.SchemaForType(meetingType.RequiresReport, meetingType.ReportSchema);
        var normalized = AttendanceReportPolicy.NormalizeAnswers(schema, answers);
        submission.ReportPayload = AttendanceReportPolicy.SerializeDocument(
            new AttendanceReportDocumentDto(schema.ToList(), normalized));
    }

    public void ApplyOnSubmit(
        AttendanceMeetingType? meetingType,
        AttendanceScopeSubmission submission,
        IReadOnlyDictionary<string, JsonElement>? answers)
    {
        if (meetingType is null || !meetingType.RequiresReport)
        {
            submission.ReportPayload = null;
            return;
        }

        var schema = AttendanceReportPolicy.SchemaForType(true, meetingType.ReportSchema);
        var incoming = answers ?? AttendanceReportPolicy.ParseDocument(submission.ReportPayload)?.Answers;
        var normalized = AttendanceReportPolicy.NormalizeAnswers(schema, incoming);
        if (!AttendanceReportPolicy.IsComplete(schema, normalized))
            throw new BadRequestException("Complete the required report before submitting");

        submission.ReportPayload = AttendanceReportPolicy.SerializeDocument(
            new AttendanceReportDocumentDto(schema.ToList(), normalized));
    }

    public static AttendanceReportDocumentDto? ToDto(string? payload) =>
        AttendanceReportPolicy.ParseDocument(payload);

    private async Task<(AttendanceOccurrence Occurrence, AttendanceScopeSubmission Submission)> LoadEditableAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid scopeNodeId,
        bool pastorOverride,
        CancellationToken ct)
    {
        var churchId = support.RequireStructureChurch(actor);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.ScopeSubmissions)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        var submission = occurrence.ScopeSubmissions
            .SingleOrDefault(s => s.ScopeNodeId == scopeNodeId)
            ?? throw new ForbiddenException("Scope submission not found");

        if (!await scope.CanEditScopeSubmissionAsync(actor, authUserId, occurrence, submission, pastorOverride, ct))
        {
            if (submission.LockStatus == AttendanceScopeLockStatus.NotYetOpen
                || DateTimeOffset.UtcNow < occurrence.SubmissionOpensAt)
            {
                throw new ForbiddenException("Attendance is not open yet for this occurrence");
            }

            throw new ForbiddenException("Attendance is locked for this scope");
        }

        return (occurrence, submission);
    }
}
