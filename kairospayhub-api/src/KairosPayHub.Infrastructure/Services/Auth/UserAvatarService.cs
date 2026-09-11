using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Storage;
using Microsoft.AspNetCore.Identity;

namespace KairosPayHub.Api.Services;

public class UserAvatarService(UserManager<ApplicationUser> users, IObjectStorage storage)
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    private const int MaxBytes = 2 * 1024 * 1024;

    public async Task<string> UploadAvatarAsync(
        Guid authUserId,
        string? email,
        string? displayName,
        Stream file,
        string contentType,
        long contentLength,
        CancellationToken ct = default)
    {
        if (!storage.IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        if (!AllowedTypes.Contains(contentType))
            throw new ArgumentException("Avatar must be JPEG, PNG, or WebP");

        if (contentLength <= 0 || contentLength > MaxBytes)
            throw new ArgumentException("Avatar must be between 1 byte and 2 MB");

        var ext = contentType switch
        {
            "image/png" => "png",
            "image/webp" => "webp",
            _ => "jpg",
        };
        var key = $"users/{authUserId}/avatar.{ext}";

        var publicUrl = await storage.UploadAsync(key, file, contentType, ct);
        var user = await EnsureUserAsync(authUserId, email, displayName);
        user.AvatarUrl = publicUrl;
        var update = await users.UpdateAsync(user);
        if (!update.Succeeded)
            throw new InvalidOperationException(string.Join("; ", update.Errors.Select(e => e.Description)));

        return publicUrl;
    }

    public async Task<string?> GetAvatarUrlAsync(Guid authUserId)
    {
        var user = await users.FindByIdAsync(authUserId.ToString());
        return user?.AvatarUrl;
    }

    private async Task<ApplicationUser> EnsureUserAsync(
        Guid authUserId,
        string? email,
        string? displayName)
    {
        var existing = await users.FindByIdAsync(authUserId.ToString());
        if (existing is not null)
            return existing;

        var normalizedEmail = string.IsNullOrWhiteSpace(email)
            ? $"{authUserId:N}@users.local"
            : email.Trim();

        var user = new ApplicationUser
        {
            Id = authUserId,
            UserName = normalizedEmail,
            Email = normalizedEmail,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? normalizedEmail : displayName.Trim(),
            EmailConfirmed = true,
        };

        var created = await users.CreateAsync(user);
        if (!created.Succeeded)
        {
            // Race: another request created the same id/email.
            existing = await users.FindByIdAsync(authUserId.ToString());
            if (existing is not null)
                return existing;
            throw new InvalidOperationException(string.Join("; ", created.Errors.Select(e => e.Description)));
        }

        return user;
    }
}
