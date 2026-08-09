using KairosPayHub.Api;
using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Email;
using KairosPayHub.Api.Hubs;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

// Render starter containers hit Linux inotify limits when appsettings reload is enabled.
Environment.SetEnvironmentVariable("DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE", "false");

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddHttpContextAccessor();
builder.Services.AddSignalR();

var connectionString = DbConnectionString.Normalize(
    builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured"));
builder.Services.AddDbContext<KairosDbContext>(o => o.UseNpgsql(connectionString));

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<KairosDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));
builder.Services.Configure<R2Options>(builder.Configuration.GetSection(R2Options.SectionName));
builder.Services.PostConfigure<R2Options>(o =>
{
    o.AccessKeyId ??= builder.Configuration["CLOUDFLARE_R2_ACCESS_KEY_ID"];
    o.SecretAccessKey ??= builder.Configuration["CLOUDFLARE_R2_SECRET_ACCESS_KEY"];
    o.Endpoint ??= builder.Configuration["CLOUDFLARE_R2_ENDPOINT"];
});
builder.Services.AddSingleton<IObjectStorage, R2ObjectStorage>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<SmtpEmailSender>();
builder.Services.AddSingleton<IEmailSender, LoggingEmailSender>();

builder.Services.AddScoped<CurrentActor>();
builder.Services.AddScoped<ChurchService>();
builder.Services.AddScoped<StructureLeaderAccountService>();
builder.Services.AddScoped<StructureService>();
builder.Services.AddScoped<GivingProgramService>();
builder.Services.AddScoped<GivingScopeService>();
builder.Services.AddScoped<ContributionService>();
builder.Services.AddScoped<AttendanceMeetingTypeService>();
builder.Services.AddScoped<AttendanceRollCallSyncService>();
builder.Services.AddScoped<AttendanceRollCallExtrasService>();
builder.Services.AddScoped<AttendanceOccurrenceGenerator>();
builder.Services.AddScoped<AttendanceScopeService>();
builder.Services.AddScoped<AttendanceSubmissionService>();
builder.Services.AddScoped<ChurchAdministratorService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<INotificationPublisher, SignalRNotificationPublisher>();
builder.Services.AddScoped<ChurchBrandingService>();
builder.Services.AddScoped<LeaderInviteService>();

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration is missing");
if (string.IsNullOrWhiteSpace(jwt.SigningKey) || jwt.SigningKey.Length < 32)
    throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken)
                    && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
var corsPolicyName = "AppCors";
builder.Services.AddCors(o => o.AddPolicy(corsPolicyName, p =>
    p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

if (builder.Configuration.GetValue("Database:MigrateOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<KairosDbContext>().Database.Migrate();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapGet("/", () => Results.Ok(new
{
    name = "KairosPayHub API",
    status = "running",
    health = "/health",
    hint = "Use the React app at http://127.0.0.1:5173 — this URL is the API only.",
}));

app.UseCors(corsPolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications").RequireCors(corsPolicyName);

app.Run();

public partial class Program;
