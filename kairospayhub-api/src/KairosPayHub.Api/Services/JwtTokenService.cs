using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KairosPayHub.Api.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace KairosPayHub.Api.Services;

public class JwtTokenService(IOptions<JwtOptions> options)
{
    public string CreateAccessToken(ApplicationUser user)
    {
        var cfg = options.Value;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new("name", user.DisplayName),
        };

        var token = new JwtSecurityToken(
            issuer: cfg.Issuer,
            audience: cfg.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(cfg.AccessTokenMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
