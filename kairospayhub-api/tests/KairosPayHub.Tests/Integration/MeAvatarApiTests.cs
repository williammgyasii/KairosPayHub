using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using KairosPayHub.Api.Storage;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class MeAvatarApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient AuthedClient(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    private async Task<(Guid AuthUserId, HttpClient Client)> SeedPastorAsync()
    {
        var authUserId = Guid.NewGuid();
        var client = AuthedClient(authUserId, "avatar.pastor@example.com", "Avatar Pastor");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Avatar Church"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        })).StatusCode);
        return (authUserId, client);
    }

    private static MultipartFormDataContent PngForm(string fileName = "avatar.png")
    {
        // Minimal 1x1 PNG
        var bytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, "file", fileName);
        return content;
    }

    [Fact]
    public async Task Upload_avatar_sets_me_avatarUrl()
    {
        var (_, client) = await SeedPastorAsync();

        var upload = await client.PostAsync("/api/me/avatar", PngForm());
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        var body = await upload.Content.ReadFromJsonAsync<JsonElement>();
        var url = body.GetProperty("avatarUrl").GetString();
        Assert.False(string.IsNullOrWhiteSpace(url));
        Assert.StartsWith("https://fake.test/users/", url);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal(url, me.GetProperty("avatarUrl").GetString());
    }

    [Fact]
    public async Task Replace_avatar_updates_me_avatarUrl()
    {
        var (_, client) = await SeedPastorAsync();

        var first = await (await client.PostAsync("/api/me/avatar", PngForm("a.png")))
            .Content.ReadFromJsonAsync<JsonElement>();
        var firstUrl = first.GetProperty("avatarUrl").GetString();

        var second = await (await client.PostAsync("/api/me/avatar", PngForm("b.png")))
            .Content.ReadFromJsonAsync<JsonElement>();
        var secondUrl = second.GetProperty("avatarUrl").GetString();

        Assert.Equal(firstUrl, secondUrl); // same object key
        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal(secondUrl, me.GetProperty("avatarUrl").GetString());
    }

    [Fact]
    public async Task Invalid_avatar_type_returns_400()
    {
        var (_, client) = await SeedPastorAsync();
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes("not-an-image"));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        content.Add(file, "file", "notes.txt");

        var res = await client.PostAsync("/api/me/avatar", content);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Storage_not_configured_returns_503()
    {
        await using var factory = new UnconfiguredStorageApiFactory(fx.ConnectionString);
        await fx.ResetAsync();
        var authUserId = Guid.NewGuid();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "no.storage@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "No Storage");

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("No Storage Church"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        })).StatusCode);

        var res = await client.PostAsync("/api/me/avatar", PngForm());
        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
    }
}

file sealed class UnconfiguredObjectStorage : IObjectStorage
{
    public bool IsConfigured => false;

    public Task<string> UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default) =>
        throw new ObjectStorageNotConfiguredException();

    public string? PublicUrlForKey(string key) => null;

    public Task<(Stream Stream, string ContentType)?> TryOpenReadAsync(string key, CancellationToken ct = default) =>
        Task.FromResult<(Stream Stream, string ContentType)?>(null);
}

file sealed class UnconfiguredStorageApiFactory(string connectionString) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Database:MigrateOnStartup", "false");
        ApiFactory.ConfigureJwt(builder);

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IObjectStorage>();
            services.AddSingleton<IObjectStorage, UnconfiguredObjectStorage>();
            services.AddSingleton<IPostConfigureOptions<AuthenticationOptions>, TestAuthDefaults>();
            services
                .AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }
}
