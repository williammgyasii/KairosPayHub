using System.Text.Json.Serialization;
using Amazon.CognitoIdentityProvider;
using KairosPayHub.Api;
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

var connectionString = DbConnectionString.Normalize(
    builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured"));
builder.Services.AddDbContext<KairosDbContext>(o => o.UseNpgsql(connectionString));

builder.Services.AddScoped<CurrentActor>();
builder.Services.AddScoped<ChurchService>();
builder.Services.AddScoped<RecordService>();
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<LeaderInviteService>();
builder.Services.AddSingleton<IAmazonCognitoIdentityProvider>(
    _ => new AmazonCognitoIdentityProviderClient());

// Cognito ID tokens: validate issuer + signature + expiry + audience. The ID
// token carries the identity claims we need (sub, email, name); its `aud` is the
// app client id. We also require token_use=id to reject access tokens.
var authority = builder.Configuration["Cognito:Authority"];
var clientId = builder.Configuration["Cognito:ClientId"];
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authority;
        options.MapInboundClaims = false;
        options.TokenValidationParameters.ValidateIssuer = true;
        options.TokenValidationParameters.ValidateLifetime = true;
        options.TokenValidationParameters.ValidateAudience = true;
        options.TokenValidationParameters.ValidAudience = clientId;
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = ctx =>
            {
                var tokenUse = ctx.Principal?.FindFirst("token_use")?.Value;
                if (tokenUse != "id")
                    ctx.Fail("Expected a Cognito ID token");
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (builder.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    DbConnectionString.EnsureDatabaseExists(connectionString);
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
