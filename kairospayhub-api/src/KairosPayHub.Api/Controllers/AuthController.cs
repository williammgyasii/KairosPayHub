using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(AuthService auth, UserManager<ApplicationUser> users) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        try
        {
            await auth.RegisterAsync(request.Name, request.Email, request.Password, ct);
            return Ok(new { message = "Check your email for a confirmation code" });
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request, CancellationToken ct)
    {
        try
        {
            await auth.ConfirmEmailAsync(request.Email, request.Code, ct);
            return Ok(new { message = "Email confirmed" });
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationRequest request, CancellationToken ct)
    {
        await auth.ResendConfirmationAsync(request.Email, ct);
        return Ok(new { message = "If that email is registered, a new code was sent" });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        try
        {
            var tokens = await auth.LoginAsync(request.Email, request.Password, ct);
            return Ok(ToResponse(tokens));
        }
        catch (AuthException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        try
        {
            var tokens = await auth.RefreshAsync(request.RefreshToken, ct);
            return Ok(ToResponse(tokens));
        }
        catch (AuthException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request.RefreshToken, ct);
        return Ok(new { message = "Signed out" });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(request.Email, ct);
        return Ok(new { message = "If that email is registered, a reset link was sent" });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        try
        {
            await auth.ResetPasswordAsync(request.Token, request.Password, ct);
            return Ok(new { message = "Password updated" });
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        try
        {
            await auth.SetPasswordAsync(request.Token, request.Password, ct);
            return Ok(new { message = "Password set" });
        }
        catch (AuthException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();

        return Ok(new
        {
            email = user.Email,
            name = user.DisplayName,
            emailConfirmed = user.EmailConfirmed,
        });
    }

    private static object ToResponse(AuthTokens tokens) => new
    {
        accessToken = tokens.AccessToken,
        refreshToken = tokens.RefreshToken,
        expiresIn = tokens.ExpiresInSeconds,
    };
}

public record RegisterRequest(string Name, string Email, string Password);
public record ConfirmEmailRequest(string Email, string Code);
public record ResendConfirmationRequest(string Email);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string Password);
