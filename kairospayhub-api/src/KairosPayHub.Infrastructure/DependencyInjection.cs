using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Outreach;
using KairosPayHub.Api.Outreach;
using KairosPayHub.Api.Email;
using KairosPayHub.Api.FeatureFlags;
using KairosPayHub.Api.Infrastructure;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using KairosPayHub.Api.Streaming;
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
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<KairosDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<OutreachOptions>(configuration.GetSection(OutreachOptions.SectionName));
        services.Configure<Notifications.WebPushOptions>(
            configuration.GetSection(Notifications.WebPushOptions.SectionName));
        services.Configure<R2Options>(configuration.GetSection(R2Options.SectionName));
        services.Configure<ServiceRecordingsFeatureOptions>(
            configuration.GetSection(ServiceRecordingsFeatureOptions.SectionName));
        services.Configure<BunnyStreamOptions>(configuration.GetSection(BunnyStreamOptions.SectionName));
        services.PostConfigure<R2Options>(o =>
        {
            o.AccessKeyId ??= configuration["CLOUDFLARE_R2_ACCESS_KEY_ID"];
            o.SecretAccessKey ??= configuration["CLOUDFLARE_R2_SECRET_ACCESS_KEY"];
            o.Endpoint ??= configuration["CLOUDFLARE_R2_ENDPOINT"];
        });

        services.AddHttpClient(nameof(BunnyStreamClient));
        services.AddSingleton<IObjectStorage, R2ObjectStorage>();
        services.AddScoped<IBunnyStreamClient, BunnyStreamClient>();
        services.AddSingleton<SmtpEmailSender>();
        services.AddSingleton<IEmailSender, LoggingEmailSender>();
        services.AddMemoryCache();
        services.AddSingleton<ChurchReadCache>();
        services.AddScoped<IChurchOperationalReset, EfChurchOperationalReset>();
        services.AddScoped<JwtTokenService>();
        services.AddScoped<IPasswordHasher<SuperadminOperator>, PasswordHasher<SuperadminOperator>>();
        services.AddScoped<SuperadminSignIn>();
        services.AddScoped<AuthService>();
        services.AddScoped<ChurchService>();
        services.AddScoped<StructureLeaderAccountService>();
        services.AddScoped<StructureMemberService>();
        services.AddScoped<UnitJoinInviteService>();
        services.AddScoped<StructureTemplateService>();
        services.AddScoped<StructureTemplateEvolveService>();
        services.AddScoped<StructureTreeService>();
        services.AddScoped<StructureNodeService>();
        services.AddScoped<LayerAccessService>();
        services.AddScoped<GivingProgramService>();
        services.AddScoped<GivingScopeService>();
        services.AddScoped<ContributionService>();
        services.AddScoped<AttendanceMeetingTypeService>();
        services.AddScoped<AttendanceRollCallSyncService>();
        services.AddScoped<AttendanceRollCallExtrasService>();
        services.AddScoped<AttendanceOccurrenceGenerator>();
        services.AddScoped<AttendanceScopeService>();
        services.AddScoped<AttendanceSubmissionSupport>();
        services.AddScoped<AttendanceOccurrenceQueryService>();
        services.AddScoped<AttendanceSubmissionService>();
        services.AddScoped<AttendanceReportService>();
        services.AddScoped<AttendanceMeetingPackService>();
        services.AddScoped<GuestRiskService>();
        services.AddScoped<AttendanceApprovalService>();
        services.AddScoped<AttendanceMemberHistoryService>();
        services.AddScoped<ChurchAdministratorService>();
        services.AddSingleton<Notifications.IWebPushSender, Notifications.LibWebPushSender>();
        services.AddScoped<NotificationEngine>();
        services.AddScoped<WebPushPublisher>();
        services.AddScoped<NotificationInboxService>();
        services.AddScoped<WebPushSubscriptionService>();
        services.AddScoped<NotificationRecipientResolver>();
        services.AddScoped<NotificationService>();
        services.AddScoped<MeetingTypeNotificationService>();
        services.AddScoped<ChurchBrandingService>();
        services.AddScoped<UserAvatarService>();
        services.AddScoped<UserTablePreferenceService>();
        services.AddScoped<LeaderInviteService>();
        services.AddScoped<CalendarEventService>();
        services.AddScoped<ServiceRecordingCategoryService>();
        services.AddScoped<ServiceRecordingSeriesService>();
        services.AddScoped<ServiceRecordingThumbnailService>();
        services.AddScoped<ServiceRecordingService>();
        services.AddHttpClient<IAreaGeocoder, CensusAreaGeocoder>(client =>
            client.Timeout = TimeSpan.FromSeconds(15));
        services.AddHttpClient<ILocationGeocoder, CensusLocationGeocoder>(client =>
            client.Timeout = TimeSpan.FromSeconds(15));
        services.AddHttpClient<ICityCatalog, CensusCityCatalog>(client =>
            client.Timeout = TimeSpan.FromSeconds(20));
        services.AddHttpClient<IChurchPlaceSearch, OpenPlacesChurchSearch>(client =>
            client.Timeout = TimeSpan.FromSeconds(30));
        services.AddHttpClient<IChurchPageFetcher, HttpChurchPageFetcher>(client =>
            client.Timeout = TimeSpan.FromSeconds(12));
        services.AddScoped<OutreachScoutService>();
        services.AddScoped<OutreachLeadService>();
        services.AddScoped<IOutreachMailbox, OutreachMailbox>();
        services.AddHttpClient<IOutreachDraftWriter, OutreachDraftWriter>();

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
