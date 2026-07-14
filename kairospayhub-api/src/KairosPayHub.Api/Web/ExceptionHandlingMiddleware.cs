using System.Text.Json;
using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;

namespace KairosPayHub.Api.Web;

public class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var (status, message) = ex switch
            {
                ForbiddenException => (StatusCodes.Status403Forbidden, ex.Message),
                NotOnboardedException => (StatusCodes.Status409Conflict, ex.Message),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred"),
            };

            if (status == StatusCodes.Status500InternalServerError)
                logger.LogError(ex, "Unhandled exception");

            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                JsonSerializer.Serialize(new { error = message }));
        }
    }
}
