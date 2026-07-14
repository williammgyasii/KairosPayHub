using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace KairosPayHub.Tests.Integration;

/// <summary>
/// Boots the real API against the shared Testcontainers Postgres, but swaps
/// Cognito JWT auth for the header-based <see cref="TestAuthHandler"/>.
/// </summary>
public class ApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Database:MigrateOnStartup", "false");
        builder.UseSetting("Cognito:Authority", "");
        builder.UseSetting("Cognito:ClientId", "");

        builder.ConfigureTestServices(services =>
        {
            services
                .AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }
}
