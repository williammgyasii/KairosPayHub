using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AuthTests : IAsyncLifetime
{
    private readonly PostgresFixture _fx;
    private readonly AuthApiFactory _factory;

    public AuthTests(PostgresFixture fx)
    {
        _fx = fx;
        _factory = new AuthApiFactory(fx.ConnectionString);
    }

    public Task InitializeAsync() => _fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Onboarding_relinks_legacy_user_when_email_already_exists()
    {
        var oldAuthUserId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var churchId = Guid.NewGuid();

        await using (var db = _fx.CreateContext())
        {
            db.Organizations.Add(new KairosPayHub.Api.Domain.Organization
            {
                Id = orgId,
                Name = "Legacy Org",
            });
            db.StructureChurches.Add(new KairosPayHub.Api.Domain.Structure.Church
            {
                Id = churchId,
                Name = "Legacy Church",
            });
            db.AppUsers.Add(new KairosPayHub.Api.Domain.User
            {
                OrganizationId = orgId,
                AuthSubject = oldAuthUserId.ToString(),
                Name = "William",
                Email = "legacy-pastor@example.com",
                Role = KairosPayHub.Api.Domain.Role.Pastor,
            });
            db.RoleAssignments.Add(new KairosPayHub.Api.Domain.Structure.RoleAssignment
            {
                ChurchId = churchId,
                AuthUserId = oldAuthUserId,
                Role = KairosPayHub.Api.Domain.Structure.ChurchRole.Pastor,
            });
            await db.SaveChangesAsync();
        }

        _factory.Email.Clear();
        var client = _factory.CreateClient();

        await client.PostAsJsonAsync("/auth/register", new
        {
            name = "William",
            email = "legacy-pastor@example.com",
            password = "Password1",
        });
        var code = _factory.Email.ExtractConfirmationCode()!;
        await client.PostAsJsonAsync("/auth/confirm-email", new
        {
            email = "legacy-pastor@example.com",
            code,
        });

        var login = await client.PostAsJsonAsync("/auth/login", new
        {
            email = "legacy-pastor@example.com",
            password = "Password1",
        });
        var access = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access);

        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { churchName = "Grace Assembly" });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);

        var body = await onboard.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("relinked").GetBoolean());
        Assert.Equal(churchId, body.GetProperty("churchId").GetGuid());

        await using var verify = _fx.CreateContext();
        var newAuthUserId = await verify.Users
            .Where(u => u.Email == "legacy-pastor@example.com")
            .Select(u => u.Id)
            .SingleAsync();
        var assignment = await verify.RoleAssignments.SingleAsync();
        Assert.Equal(newAuthUserId, assignment.AuthUserId);
        Assert.Equal(1, await verify.AppUsers.CountAsync());
    }

    [Fact]
    public async Task Register_confirm_login_and_onboard()
    {
        _factory.Email.Clear();
        var client = _factory.CreateClient();

        var register = await client.PostAsJsonAsync("/auth/register", new
        {
            name = "Pastor Joe",
            email = "pastor@example.com",
            password = "Password1",
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);

        var code = _factory.Email.ExtractConfirmationCode();
        Assert.NotNull(code);

        var confirm = await client.PostAsJsonAsync("/auth/confirm-email", new
        {
            email = "pastor@example.com",
            code,
        });
        Assert.Equal(HttpStatusCode.OK, confirm.StatusCode);

        var login = await client.PostAsJsonAsync("/auth/login", new
        {
            email = "pastor@example.com",
            password = "Password1",
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>();
        var access = tokens.GetProperty("accessToken").GetString();
        Assert.False(string.IsNullOrEmpty(access));

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.False(me.GetProperty("onboarded").GetBoolean());

        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { organizationName = "Grace" });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);

        me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(me.GetProperty("onboarded").GetBoolean());
        Assert.Equal("Pastor", me.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Pastor_invites_leader_set_password_and_submit_record()
    {
        _factory.Email.Clear();
        var client = await LoginPastorAsync();

        var churchResp = await client.PostAsJsonAsync("/api/churches", new { name = "Main" });
        var churchId = (await churchResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        _factory.Email.Clear();
        var invite = await client.PostAsJsonAsync("/api/leaders", new
        {
            email = "leader@example.com",
            name = "Leader One",
            churchId,
        });
        Assert.Equal(HttpStatusCode.OK, invite.StatusCode);

        var body = _factory.Email.LastBody ?? throw new InvalidOperationException("No invite email");
        var token = ExtractQueryToken(body, "token=");
        Assert.False(string.IsNullOrEmpty(token));

        var leaderClient = _factory.CreateClient();
        var setPwd = await leaderClient.PostAsJsonAsync("/auth/set-password", new
        {
            token,
            password = "Password1",
        });
        Assert.Equal(HttpStatusCode.OK, setPwd.StatusCode);

        var login = await leaderClient.PostAsJsonAsync("/auth/login", new
        {
            email = "leader@example.com",
            password = "Password1",
        });
        var access = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString();
        leaderClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access);

        var submit = await leaderClient.PostAsJsonAsync("/api/records", new
        {
            churchId,
            amount = 50m,
            dateSent = "2026-07-01T00:00:00Z",
            method = "Cash",
        });
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
    }

    private async Task<HttpClient> LoginPastorAsync()
    {
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/auth/register", new
        {
            name = "Pastor",
            email = "p@example.com",
            password = "Password1",
        });
        var code = _factory.Email.ExtractConfirmationCode()!;
        await client.PostAsJsonAsync("/auth/confirm-email", new { email = "p@example.com", code });
        var login = await client.PostAsJsonAsync("/auth/login", new { email = "p@example.com", password = "Password1" });
        var access = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access);
        await client.PostAsJsonAsync("/api/onboarding", new { organizationName = "Org" });
        return client;
    }

    private static string ExtractQueryToken(string body, string prefix)
    {
        var idx = body.IndexOf(prefix, StringComparison.Ordinal);
        if (idx < 0) return string.Empty;
        var start = idx + prefix.Length;
        var end = start;
        while (end < body.Length && !char.IsWhiteSpace(body[end])) end++;
        return body[start..end];
    }
}
