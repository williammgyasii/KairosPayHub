using Microsoft.AspNetCore.Identity;

namespace KairosPayHub.Api.Auth;

public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Public URL for the user's profile photo (R2), if set.</summary>
    public string? AvatarUrl { get; set; }
}
