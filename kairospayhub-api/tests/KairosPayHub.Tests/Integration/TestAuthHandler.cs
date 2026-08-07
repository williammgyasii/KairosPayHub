using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Tests.Integration;

/// <summary>
/// Stands in for JWT validation during integration tests. A request is
/// "authenticated" if it carries an X-Test-Sub header; email/name are optional.
/// </summary>
public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-Sub", out var sub) || string.IsNullOrEmpty(sub))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new List<Claim> { new("sub", sub!) };
        if (Request.Headers.TryGetValue("X-Test-Email", out var email))
            claims.Add(new Claim("email", email!));
        if (Request.Headers.TryGetValue("X-Test-Name", out var name))
            claims.Add(new Claim("name", name!));

        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName)),
            SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
