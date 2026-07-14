using System.Text.Json.Serialization;
using Amazon.CognitoIdentityProvider;
using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddHttpContextAccessor();

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured");
builder.Services.AddDbContext<KairosDbContext>(o => o.UseNpgsql(connectionString));

builder.Services.AddScoped<CurrentActor>();
builder.Services.AddScoped<ChurchService>();
builder.Services.AddScoped<RecordService>();
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<LeaderInviteService>();
builder.Services.AddSingleton<IAmazonCognitoIdentityProvider>(
    _ => new AmazonCognitoIdentityProviderClient());

// Cognito access tokens: validate issuer + signature + expiry. Audience is not
// present on Cognito access tokens, so we validate the client_id claim instead.
var authority = builder.Configuration["Cognito:Authority"];
var clientId = builder.Configuration["Cognito:ClientId"];
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authority;
        options.MapInboundClaims = false;
        options.TokenValidationParameters.ValidateAudience = false;
        options.TokenValidationParameters.ValidateIssuer = true;
        options.TokenValidationParameters.ValidateLifetime = true;
        if (!string.IsNullOrEmpty(clientId))
        {
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = ctx =>
                {
                    var tokenClientId = ctx.Principal?.FindFirst("client_id")?.Value;
                    if (tokenClientId != clientId)
                        ctx.Fail("Token was issued for a different client");
                    return Task.CompletedTask;
                },
            };
        }
    });
builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (builder.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<KairosDbContext>().Database.Migrate();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
