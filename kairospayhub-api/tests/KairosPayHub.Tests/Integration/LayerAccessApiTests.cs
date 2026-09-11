using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Authorization;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class LayerAccessApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Pastor_gets_layer_admin_rows_and_can_save_diffs()
    {
        var pastor = AuthedClient(Guid.NewGuid(), "pastor.access@example.com", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Access Church"));
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Zone" },
                new { standardType = "Cell", displayName = "Home group" },
            },
        });
        await pastor.PostAsJsonAsync("/api/settings/administrators", new
        {
            firstName = "Jane",
            lastName = "Admin",
            email = "jane.access-admin@example.com",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        });

        var grid = await pastor.GetFromJsonAsync<JsonElement>("/api/access");
        var rows = grid.GetProperty("rows").EnumerateArray().ToList();
        Assert.Contains(rows, r => r.GetProperty("label").GetString() == "Zone");
        Assert.Contains(rows, r => r.GetProperty("label").GetString() == "Home group");
        Assert.Contains(rows, r => r.GetProperty("subjectKind").GetString() == "adminProfile");
        Assert.Contains(rows, r => r.GetProperty("label").GetString() == "Jane Admin");

        var home = rows.Single(r => r.GetProperty("label").GetString() == "Home group");
        var createCell = home.GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("ability").GetString() == ProductAbilities.CreateChildUnits);
        Assert.False(createCell.GetProperty("effectiveOn").GetBoolean());
        Assert.True(createCell.GetProperty("locked").GetBoolean());

        var zone = rows.Single(r => r.GetProperty("label").GetString() == "Zone");
        var zoneCreate = zone.GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("ability").GetString() == ProductAbilities.CreateChildUnits);
        Assert.True(zoneCreate.GetProperty("effectiveOn").GetBoolean());

        var save = await pastor.PutAsJsonAsync("/api/access", new
        {
            changes = new[]
            {
                new
                {
                    subjectKind = "layer",
                    subjectId = zone.GetProperty("subjectId").GetGuid(),
                    ability = ProductAbilities.CreateChildUnits,
                    enabled = false,
                },
            },
        });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        await using var db = fx.CreateContext();
        Assert.Equal(1, await db.ChurchAbilityOverlays.CountAsync());
    }

    [Fact]
    public async Task Church_admin_cannot_get_or_put_access()
    {
        var pastor = AuthedClient(Guid.NewGuid(), "pastor.deny@example.com", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Deny Church"));
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        });
        await pastor.PostAsJsonAsync("/api/settings/administrators", new
        {
            firstName = "Bo",
            lastName = "Admin",
            email = "bo.access-admin@example.com",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        });

        await using var db = fx.CreateContext();
        var adminId = await db.ChurchAdministrators
            .Where(a => a.Email == "bo.access-admin@example.com")
            .Select(a => a.AuthUserId)
            .SingleAsync();
        var admin = AuthedClient(adminId, "bo.access-admin@example.com", "Bo Admin");

        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync("/api/access")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PutAsJsonAsync("/api/access", new
        {
            changes = Array.Empty<object>(),
        })).StatusCode);
    }

    [Fact]
    public async Task Named_admin_cannot_exceed_administrator_profile()
    {
        var pastor = AuthedClient(Guid.NewGuid(), "pastor.limit@example.com", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Limit Church"));
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        });
        await pastor.PostAsJsonAsync("/api/settings/administrators", new
        {
            firstName = "Limited",
            lastName = "Admin",
            email = "limited.admin@example.com",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        });

        await using var db = fx.CreateContext();
        var adminId = await db.ChurchAdministrators
            .Where(a => a.Email == "limited.admin@example.com")
            .Select(a => a.AuthUserId)
            .SingleAsync();

        var save = await pastor.PutAsJsonAsync("/api/access", new
        {
            changes = new object[]
            {
                new
                {
                    subjectKind = "adminProfile",
                    subjectId = (Guid?)null,
                    ability = ProductAbilities.ApproveGiving,
                    enabled = false,
                },
                new
                {
                    subjectKind = "adminUser",
                    subjectId = adminId,
                    ability = ProductAbilities.ApproveGiving,
                    enabled = true,
                },
            },
        });
        Assert.Equal(HttpStatusCode.BadRequest, save.StatusCode);
    }

    [Fact]
    public async Task Admin_overlay_strips_me_abilities_but_not_pastor()
    {
        var pastorSub = Guid.NewGuid();
        var pastor = AuthedClient(pastorSub, "pastor.overlay@example.com", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Overlay Church"));
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        });
        await pastor.PostAsJsonAsync("/api/settings/administrators", new
        {
            firstName = "Ova",
            lastName = "Admin",
            email = "ova.admin@example.com",
            affiliationKind = "External",
            password = "AdminPass1!",
            sendInviteEmail = false,
        });

        var save = await pastor.PutAsJsonAsync("/api/access", new
        {
            changes = new[]
            {
                new
                {
                    subjectKind = "adminProfile",
                    subjectId = (Guid?)null,
                    ability = ProductAbilities.ViewOverallGivings,
                    enabled = false,
                },
            },
        });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        var pastorMe = await pastor.GetFromJsonAsync<JsonElement>("/api/me");
        var pastorAbilities = pastorMe.GetProperty("abilities").EnumerateArray().Select(a => a.GetString()).ToHashSet();
        Assert.Contains(ProductAbilities.ViewOverallGivings, pastorAbilities);

        await using var db = fx.CreateContext();
        var adminId = await db.ChurchAdministrators
            .Where(a => a.Email == "ova.admin@example.com")
            .Select(a => a.AuthUserId)
            .SingleAsync();
        var admin = AuthedClient(adminId, "ova.admin@example.com", "Ova Admin");
        var adminMe = await admin.GetFromJsonAsync<JsonElement>("/api/me");
        var adminAbilities = adminMe.GetProperty("abilities").EnumerateArray().Select(a => a.GetString()).ToHashSet();
        Assert.DoesNotContain(ProductAbilities.ViewOverallGivings, adminAbilities);
    }

    HttpClient AuthedClient(Guid sub, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }
}
