using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Email;
using KairosPayHub.Api.Infrastructure;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using KairosPayHub.Application.Structure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KairosPayHub.Api;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddKairosInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = DbConnectionString.Normalize(
            configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured"));
        services.AddDbContext<KairosDbContext>(o => o.UseNpgsql(connectionString));

        services
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

        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<R2Options>(configuration.GetSection(R2Options.SectionName));
        services.PostConfigure<R2Options>(o =>
        {
            o.AccessKeyId ??= configuration["CLOUDFLARE_R2_ACCESS_KEY_ID"];
            o.SecretAccessKey ??= configuration["CLOUDFLARE_R2_SECRET_ACCESS_KEY"];
            o.Endpoint ??= configuration["CLOUDFLARE_R2_ENDPOINT"];
        });

        services.AddSingleton<IObjectStorage, R2ObjectStorage>();
        services.AddSingleton<SmtpEmailSender>();
        services.AddSingleton<IEmailSender, LoggingEmailSender>();
        services.AddMemoryCache();
        services.AddSingleton<ChurchReadCache>();
        services.AddScoped<IChurchOperationalReset, EfChurchOperationalReset>();
        services.AddScoped<JwtTokenService>();
        services.AddScoped<AuthService>();
        services.AddScoped<ChurchService>();
        services.AddScoped<StructureLeaderAccountService>();
        services.AddScoped<StructureService>();
        services.AddScoped<GivingProgramService>();
        services.AddScoped<GivingScopeService>();
        services.AddScoped<ContributionService>();
        services.AddScoped<AttendanceMeetingTypeService>();
        services.AddScoped<AttendanceRollCallSyncService>();
        services.AddScoped<AttendanceRollCallExtrasService>();
        services.AddScoped<AttendanceOccurrenceGenerator>();
        services.AddScoped<AttendanceScopeService>();
        services.AddScoped<AttendanceSubmissionService>();
        services.AddScoped<AttendanceMemberHistoryService>();
        services.AddScoped<ChurchAdministratorService>();
        services.AddScoped<NotificationService>();
        services.AddScoped<ChurchBrandingService>();
        services.AddScoped<LeaderInviteService>();
        services.AddScoped<CalendarEventService>();

        return services;
    }

    public static void MigrateKairosDatabase(this IServiceProvider services, IConfiguration configuration)
    {
        if (!configuration.GetValue("Database:MigrateOnStartup", true))
            return;

        using var scope = services.CreateScope();
        scope.ServiceProvider.GetRequiredService<KairosDbContext>().Database.Migrate();
    }
}
