using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class MeTablePreferencesApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient AuthedClient(Guid authUserId, string email)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", email);
        return client;
    }

    [Fact]
    public async Task Empty_get_returns_no_maps()
    {
        var client = AuthedClient(Guid.NewGuid(), "empty.prefs@example.com");

        var body = await client.GetFromJsonAsync<JsonElement>("/api/me/table-preferences");
        Assert.Equal(JsonValueKind.Object, body.GetProperty("preferences").ValueKind);
        Assert.Empty(body.GetProperty("preferences").EnumerateObject());
    }

    [Fact]
    public async Task Put_allowed_key_then_get_returns_it()
    {
        var client = AuthedClient(Guid.NewGuid(), "save.prefs@example.com");

        var put = await client.PutAsJsonAsync("/api/me/table-preferences/columns.roster.membership", new
        {
            columns = new { email = false, phone = true },
        });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var body = await client.GetFromJsonAsync<JsonElement>("/api/me/table-preferences");
        var membership = body.GetProperty("preferences").GetProperty("columns.roster.membership");
        Assert.False(membership.GetProperty("email").GetBoolean());
        Assert.True(membership.GetProperty("phone").GetBoolean());
    }

    [Fact]
    public async Task Unknown_key_is_rejected()
    {
        var client = AuthedClient(Guid.NewGuid(), "bad.key@example.com");

        var put = await client.PutAsJsonAsync("/api/me/table-preferences/columns.nope", new
        {
            columns = new { email = false },
        });
        Assert.Equal(HttpStatusCode.BadRequest, put.StatusCode);

        var body = await client.GetFromJsonAsync<JsonElement>("/api/me/table-preferences");
        Assert.Empty(body.GetProperty("preferences").EnumerateObject());
    }

    [Fact]
    public async Task Always_on_column_cannot_be_saved_hidden()
    {
        var client = AuthedClient(Guid.NewGuid(), "always.on@example.com");

        var put = await client.PutAsJsonAsync("/api/me/table-preferences/columns.roster.units", new
        {
            columns = new { name = false, parent = false },
        });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var body = await client.GetFromJsonAsync<JsonElement>("/api/me/table-preferences");
        var units = body.GetProperty("preferences").GetProperty("columns.roster.units");
        Assert.True(units.GetProperty("name").GetBoolean());
        Assert.False(units.GetProperty("parent").GetBoolean());
    }

    [Fact]
    public async Task Other_user_does_not_see_saved_maps()
    {
        var a = AuthedClient(Guid.NewGuid(), "prefs.a@example.com");
        var b = AuthedClient(Guid.NewGuid(), "prefs.b@example.com");

        Assert.Equal(HttpStatusCode.OK, (await a.PutAsJsonAsync("/api/me/table-preferences/columns.roster.units", new
        {
            columns = new { parent = false },
        })).StatusCode);

        var body = await b.GetFromJsonAsync<JsonElement>("/api/me/table-preferences");
        Assert.Empty(body.GetProperty("preferences").EnumerateObject());
    }
}
