using KairosPayHub.Api.Email;
using KairosPayHub.Api.Storage;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Tests.Integration;

/// <summary>
/// Boots the real API against Testcontainers Postgres with header-based test auth.
/// </summary>
public class ApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    public FakeEmailSender Email { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Database:MigrateOnStartup", "false");
        ConfigureJwt(builder);

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Email);

            services.RemoveAll<IObjectStorage>();
            services.AddSingleton<IObjectStorage, FakeObjectStorage>();

            services.AddSingleton<IPostConfigureOptions<AuthenticationOptions>, TestAuthDefaults>();
            services
                .AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }

    internal static void ConfigureJwt(IWebHostBuilder builder)
    {
        builder.UseSetting("Jwt:SigningKey", "integration-test-signing-key-32chars!");
        builder.UseSetting("Jwt:Issuer", "https://test.local");
        builder.UseSetting("Jwt:Audience", "kairospayhub");
        builder.UseSetting("Email:FrontendBaseUrl", "http://localhost:5173");
        builder.UseSetting("Email:Smtp:Host", "localhost");
    }
}

/// <summary>Full JWT auth pipeline — no X-Test-Sub bypass.</summary>
public class AuthApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    public FakeEmailSender Email { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Database:MigrateOnStartup", "false");
        ApiFactory.ConfigureJwt(builder);

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Email);
        });
    }
}

internal sealed class TestAuthDefaults : IPostConfigureOptions<AuthenticationOptions>
{
    public void PostConfigure(string? name, AuthenticationOptions options)
    {
        options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
        options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
    }
}
