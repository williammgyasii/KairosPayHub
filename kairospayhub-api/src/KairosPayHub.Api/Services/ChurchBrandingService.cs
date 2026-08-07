using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Storage;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class ChurchBrandingService(KairosDbContext db, IObjectStorage storage)
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    private const int MaxBytes = 2 * 1024 * 1024;

    public async Task<string> UploadLogoAsync(
        Actor actor,
        Stream file,
        string contentType,
        long contentLength,
        CancellationToken ct = default)
    {
        if (actor.StructureRole != ChurchRole.Pastor && actor.Role != Role.Pastor)
            throw new ForbiddenException("Only a pastor can update the church logo");

        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        if (!AllowedTypes.Contains(contentType))
            throw new ArgumentException("Logo must be JPEG, PNG, or WebP");

        if (contentLength <= 0 || contentLength > MaxBytes)
            throw new ArgumentException("Logo must be between 1 byte and 2 MB");

        var churchId = actor.StructureChurchId != default
            ? actor.StructureChurchId
            : throw new NotOnboardedException("Church is not set up");

        var church = await db.StructureChurches.SingleOrDefaultAsync(c => c.Id == churchId, ct)
            ?? throw new ForbiddenException("Church not found");

        var ext = contentType switch
        {
            "image/png" => "png",
            "image/webp" => "webp",
            _ => "jpg",
        };
        var key = $"churches/{churchId}/logo.{ext}";

        var publicUrl = await storage.UploadAsync(key, file, contentType, ct);
        church.LogoUrl = publicUrl;
        await db.SaveChangesAsync(ct);
        return publicUrl;
    }
}
