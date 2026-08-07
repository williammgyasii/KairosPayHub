using Microsoft.AspNetCore.Identity;

namespace KairosPayHub.Api.Auth;

public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
}
