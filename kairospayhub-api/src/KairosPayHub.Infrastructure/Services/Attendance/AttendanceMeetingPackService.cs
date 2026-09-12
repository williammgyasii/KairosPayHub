using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Notifications;
using KairosPayHub.Api.Storage;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record MeetingPackFileDto(Guid Id, string FileName, string ContentType, long SizeBytes);

public record MeetingPackReceiptDto(
    Guid AuthUserId,
    string Name,
    DateTimeOffset? SeenAt,
    DateTimeOffset? DownloadedAt);

public record MeetingPackDto(
    Guid OccurrenceId,
    string? Note,
    DateTimeOffset PublishedAt,
    IReadOnlyList<MeetingPackFileDto> Files,
    IReadOnlyList<MeetingPackReceiptDto>? Receipts,
    DateTimeOffset? ViewerDownloadedAt);

/// <summary>
/// Publish / read / download meeting packs. Completeness lives in
/// <see cref="AttendanceMeetingPackPolicy"/>. Audience lives on the recipient resolver.
/// </summary>
public class AttendanceMeetingPackService(
    KairosDbContext db,
    GivingScopeService scope,
    AttendanceSubmissionSupport support,
    NotificationRecipientResolver recipients,
    NotificationEngine engine,
    IObjectStorage storage)
{
    public async Task<MeetingPackDto?> GetAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        var pack = await LoadPackAsync(churchId, occurrenceId, ct);
        if (pack is null)
            return null;

        var audience = await AudienceAsync(pack, exclude: null, ct);
        var manager = scope.CanManageChurch(actor);
        if (!manager && !audience.Contains(authUserId))
            throw new ForbiddenException("Meeting pack not found");

        if (!manager && audience.Contains(authUserId))
            await TouchReceiptAsync(pack.Id, authUserId, seen: true, downloaded: false, ct);

        return await ToDtoAsync(pack, includeReceipts: manager, audience, authUserId, ct);
    }

    public async Task<MeetingPackDto> PublishAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        string? note,
        IReadOnlyList<Guid> keepFileIds,
        IReadOnlyList<(Stream Stream, string FileName, string ContentType, long Length)> uploads,
        CancellationToken ct = default)
    {
        if (!scope.CanManageChurch(actor))
            throw new ForbiddenException("Only church managers can share a meeting pack");

        var churchId = support.RequireStructureChurch(actor);
        var occurrence = await db.AttendanceOccurrences
            .Include(o => o.MeetingType)
                .ThenInclude(t => t!.ScopeNodes)
            .Include(o => o.Pack!)
                .ThenInclude(p => p.Files)
            .SingleOrDefaultAsync(o => o.Id == occurrenceId && o.ChurchId == churchId, ct)
            ?? throw new ForbiddenException("Occurrence not found");

        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        var pack = occurrence.Pack ?? new AttendanceMeetingPack
        {
            ChurchId = churchId,
            OccurrenceId = occurrenceId,
            PublishedByAuthUserId = authUserId,
            PublishedAt = DateTimeOffset.UtcNow,
        };

        var previousFingerprint = pack.ContentFingerprint;
        var wasNew = occurrence.Pack is null;

        foreach (var file in pack.Files.Where(f => !keepFileIds.Contains(f.Id)).ToList())
            pack.Files.Remove(file);

        if (pack.Files.Count + uploads.Count > AttendanceMeetingPackPolicy.MaxFiles)
            throw new BadRequestException($"A pack can have at most {AttendanceMeetingPackPolicy.MaxFiles} files");

        var sort = pack.Files.Count == 0 ? 0 : pack.Files.Max(f => f.SortOrder) + 1;
        foreach (var upload in uploads)
        {
            if (!AttendanceMeetingPackPolicy.FileAllowed(upload.ContentType))
                throw new BadRequestException("Pack files must be PDF or JPEG, PNG, or WebP images");
            if (upload.Length <= 0 || upload.Length > AttendanceMeetingPackPolicy.MaxFileBytes)
                throw new BadRequestException("Pack files must be between 1 byte and 10 MB");

            var ext = upload.ContentType switch
            {
                "application/pdf" => "pdf",
                "image/png" => "png",
                "image/webp" => "webp",
                _ => "jpg",
            };
            var key = $"churches/{churchId}/meeting-packs/{occurrenceId}/{Guid.NewGuid():N}.{ext}";
            await storage.UploadAsync(key, upload.Stream, upload.ContentType, ct);
            pack.Files.Add(new AttendanceMeetingPackFile
            {
                FileName = Path.GetFileName(upload.FileName) is { Length: > 0 } name ? name : $"file.{ext}",
                StorageKey = key,
                ContentType = upload.ContentType,
                SizeBytes = upload.Length,
                SortOrder = sort++,
            });
        }

        pack.Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        if (!AttendanceMeetingPackPolicy.IsComplete(pack.Note, pack.Files.Count))
            throw new BadRequestException("Share a note or at least one file");

        pack.ContentFingerprint = AttendanceMeetingPackPolicy.Fingerprint(
            pack.Note,
            pack.Files.Select(f => f.Id));
        pack.UpdatedAt = DateTimeOffset.UtcNow;
        if (wasNew)
        {
            pack.PublishedAt = DateTimeOffset.UtcNow;
            pack.PublishedByAuthUserId = authUserId;
            db.AttendanceMeetingPacks.Add(pack);
        }

        await db.SaveChangesAsync(ct);

        var fingerprintChanged = wasNew || pack.ContentFingerprint != previousFingerprint;
        if (fingerprintChanged)
            await NotifyAsync(occurrence, pack, authUserId, ct);

        var audience = await AudienceAsync(pack, exclude: null, ct);
        await db.Entry(pack).Collection(p => p.Files).LoadAsync(ct);
        return await ToDtoAsync(pack, includeReceipts: true, audience, authUserId, ct);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> DownloadAsync(
        Actor actor,
        Guid authUserId,
        Guid occurrenceId,
        Guid fileId,
        CancellationToken ct = default)
    {
        var churchId = support.RequireStructureChurch(actor);
        var pack = await LoadPackAsync(churchId, occurrenceId, ct)
            ?? throw new ForbiddenException("Meeting pack not found");

        var audience = await AudienceAsync(pack, exclude: null, ct);
        var manager = scope.CanManageChurch(actor);
        if (!manager && !audience.Contains(authUserId))
            throw new ForbiddenException("Meeting pack not found");

        var file = pack.Files.SingleOrDefault(f => f.Id == fileId)
            ?? throw new ForbiddenException("File not found");

        var opened = await storage.TryOpenReadAsync(file.StorageKey, ct)
            ?? throw new ForbiddenException("File not found");

        if (!manager && audience.Contains(authUserId))
            await TouchReceiptAsync(pack.Id, authUserId, seen: true, downloaded: true, ct);

        return (opened.Stream, opened.ContentType, file.FileName);
    }

    private async Task<AttendanceMeetingPack?> LoadPackAsync(
        Guid churchId,
        Guid occurrenceId,
        CancellationToken ct) =>
        await db.AttendanceMeetingPacks
            .Include(p => p.Files)
            .Include(p => p.Occurrence!)
                .ThenInclude(o => o.MeetingType)
                    .ThenInclude(t => t!.ScopeNodes)
            .SingleOrDefaultAsync(p => p.OccurrenceId == occurrenceId && p.ChurchId == churchId, ct);

    private async Task<List<Guid>> AudienceAsync(
        AttendanceMeetingPack pack,
        Guid? exclude,
        CancellationToken ct)
    {
        var meetingType = pack.Occurrence?.MeetingType;
        Guid? scopeNodeId = meetingType is null || meetingType.ScopeKind == ProgramScopeKind.ChurchWide
            ? null
            : meetingType.ScopeNodeId
                ?? meetingType.ScopeNodes.Select(n => (Guid?)n.StructureNodeId).FirstOrDefault();
        return await recipients.ForMeetingPackLeadersAsync(pack.ChurchId, scopeNodeId, exclude, ct);
    }

    private async Task NotifyAsync(
        AttendanceOccurrence occurrence,
        AttendanceMeetingPack pack,
        Guid publisherId,
        CancellationToken ct)
    {
        var audience = await AudienceAsync(pack, exclude: publisherId, ct);
        if (audience.Count == 0)
            return;

        var title = occurrence.MeetingType?.Title ?? "Meeting";
        var date = occurrence.MeetingDate.ToString("dddd, d MMMM yyyy");
        await engine.DeliverAsync(
            occurrence.ChurchId,
            audience,
            NotificationKind.AttendanceMeetingPackPublished,
            $"{title} notes are ready",
            $"Notes and files were shared for {title} · {date}.",
            LinkPath: "attendance/submissions",
            programId: null,
            relatedEntityId: pack.Id,
            ct);
    }

    private async Task TouchReceiptAsync(
        Guid packId,
        Guid authUserId,
        bool seen,
        bool downloaded,
        CancellationToken ct)
    {
        var receipt = await db.AttendanceMeetingPackReceipts
            .SingleOrDefaultAsync(r => r.PackId == packId && r.AuthUserId == authUserId, ct);
        var now = DateTimeOffset.UtcNow;
        if (receipt is null)
        {
            receipt = new AttendanceMeetingPackReceipt
            {
                PackId = packId,
                AuthUserId = authUserId,
                SeenAt = seen ? now : null,
                DownloadedAt = downloaded ? now : null,
            };
            db.AttendanceMeetingPackReceipts.Add(receipt);
        }
        else
        {
            if (seen && receipt.SeenAt is null)
                receipt.SeenAt = now;
            if (downloaded && receipt.DownloadedAt is null)
                receipt.DownloadedAt = now;
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task<MeetingPackDto> ToDtoAsync(
        AttendanceMeetingPack pack,
        bool includeReceipts,
        IReadOnlyList<Guid> audience,
        Guid authUserId,
        CancellationToken ct)
    {
        var files = pack.Files
            .OrderBy(f => f.SortOrder)
            .Select(f => new MeetingPackFileDto(f.Id, f.FileName, f.ContentType, f.SizeBytes))
            .ToList();

        var viewer = await db.AttendanceMeetingPackReceipts.AsNoTracking()
            .SingleOrDefaultAsync(r => r.PackId == pack.Id && r.AuthUserId == authUserId, ct);

        IReadOnlyList<MeetingPackReceiptDto>? receipts = null;
        if (includeReceipts)
        {
            var stored = await db.AttendanceMeetingPackReceipts.AsNoTracking()
                .Where(r => r.PackId == pack.Id)
                .ToListAsync(ct);
            var byUser = stored.ToDictionary(r => r.AuthUserId);
            var names = await ResolveNamesAsync(pack.ChurchId, audience, ct);
            receipts = audience
                .OrderBy(id => names.GetValueOrDefault(id) ?? "")
                .Select(id =>
                {
                    byUser.TryGetValue(id, out var row);
                    return new MeetingPackReceiptDto(
                        id,
                        names.GetValueOrDefault(id) ?? "Leader",
                        row?.SeenAt,
                        row?.DownloadedAt);
                })
                .ToList();
        }

        return new MeetingPackDto(
            pack.OccurrenceId,
            pack.Note,
            pack.PublishedAt,
            files,
            receipts,
            viewer?.DownloadedAt);
    }

    private async Task<Dictionary<Guid, string>> ResolveNamesAsync(
        Guid churchId,
        IReadOnlyList<Guid> authUserIds,
        CancellationToken ct)
    {
        if (authUserIds.Count == 0)
            return [];

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId && m.AuthUserId != null && authUserIds.Contains(m.AuthUserId.Value))
            .Select(m => new { AuthUserId = m.AuthUserId!.Value, m.Name })
            .ToListAsync(ct);
        var map = members.ToDictionary(m => m.AuthUserId, m => m.Name);
        var missing = authUserIds.Where(id => !map.ContainsKey(id)).ToList();
        if (missing.Count == 0)
            return map;

        var users = await db.Users.AsNoTracking()
            .Where(u => missing.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToListAsync(ct);
        foreach (var user in users)
        {
            if (!string.IsNullOrWhiteSpace(user.DisplayName))
                map[user.Id] = user.DisplayName;
        }

        return map;
    }
}
