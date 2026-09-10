using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class MeProfileApiTests(PostgresFixture fx) : IAsyncLifetime
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

    private async Task<(Guid AuthUserId, Guid MemberId, HttpClient Client)> SeedCellLeaderAsync()
    {
        var authUserId = Guid.NewGuid();
        Guid memberId;
        await using (var db = fx.CreateContext())
        {
            var church = StructureSeed.Church("Profile Church");
            var template = StructureSeed.Template(church, (StructureLayerType.Cell, "Cell"));
            var cellLayer = template.Layers.Single();
            var cell = StructureSeed.Node(church, cellLayer, "Cell One");
            var member = StructureSeed.Member(church, cell, "William Cell Leader", "william.cell@example.com");
            member.AuthUserId = authUserId;
            member.Phone = "+14437622773";
            member.DateOfBirth = new DateOnly(1994, 1, 15);
            member.Residence = "Baltimore";
            member.OccupationStatus = MemberOccupationStatus.Working;
            member.SchoolOrWorkplace = "Kairos";
            db.StructureChurches.Add(church);
            db.StructureTemplates.Add(template);
            db.StructureNodes.Add(cell);
            db.ChurchMembers.Add(member);
            db.RoleAssignments.Add(StructureSeed.CellLeaderRole(church, authUserId, cell));
            await db.SaveChangesAsync();
            memberId = member.Id;
        }

        return (authUserId, memberId, AuthedClient(authUserId, "william.cell@example.com", "JWT Name"));
    }

    [Fact]
    public async Task Cell_leader_me_includes_roster_profile_fields()
    {
        var (_, memberId, client) = await SeedCellLeaderAsync();

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");

        Assert.True(me.GetProperty("onboarded").GetBoolean());
        Assert.Equal(memberId, me.GetProperty("memberId").GetGuid());
        Assert.Equal("William Cell Leader", me.GetProperty("name").GetString());
        Assert.Equal("william.cell@example.com", me.GetProperty("email").GetString());
        Assert.Equal("+14437622773", me.GetProperty("phone").GetString());
        Assert.Equal("1994-01-15", me.GetProperty("dateOfBirth").GetString());
        Assert.Equal("Baltimore", me.GetProperty("residence").GetString());
        Assert.Equal("Working", me.GetProperty("occupationStatus").GetString());
        Assert.Equal("Kairos", me.GetProperty("schoolOrWorkplace").GetString());
    }

    [Fact]
    public async Task Pastor_without_member_row_has_null_profile_fields()
    {
        var client = AuthedClient(Guid.NewGuid(), "pastor@example.com", "Pastor");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("No Row Church"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        })).StatusCode);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(me.GetProperty("onboarded").GetBoolean());
        Assert.Equal(JsonValueKind.Null, me.GetProperty("memberId").ValueKind);
        Assert.Equal(JsonValueKind.Null, me.GetProperty("dateOfBirth").ValueKind);
        Assert.Equal(JsonValueKind.Null, me.GetProperty("phone").ValueKind);
    }

    [Fact]
    public async Task Patch_me_updates_linked_member_and_ignores_email()
    {
        var (_, memberId, client) = await SeedCellLeaderAsync();

        var patch = await client.PatchAsJsonAsync("/api/me", new
        {
            name = "William Updated",
            email = "attacker@example.com",
            phone = "+14430000000",
            dateOfBirth = "1990-06-01",
            residence = "Accra",
            occupationStatus = "Student",
            schoolOrWorkplace = "UG",
        });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.Equal("William Updated", me.GetProperty("name").GetString());
        Assert.Equal("william.cell@example.com", me.GetProperty("email").GetString());
        Assert.Equal("1990-06-01", me.GetProperty("dateOfBirth").GetString());
        Assert.Equal("+14430000000", me.GetProperty("phone").GetString());
        Assert.Equal("Student", me.GetProperty("occupationStatus").GetString());
        Assert.Equal("UG", me.GetProperty("schoolOrWorkplace").GetString());

        var member = await client.GetFromJsonAsync<JsonElement>($"/api/structure/members/{memberId}");
        Assert.Equal("1990-06-01", member.GetProperty("dateOfBirth").GetString());
        Assert.Equal("William Updated", member.GetProperty("name").GetString());
        Assert.Equal("william.cell@example.com", member.GetProperty("email").GetString());

        await using var db = fx.CreateContext();
        var row = await db.ChurchMembers.SingleAsync(m => m.Id == memberId);
        Assert.Equal("william.cell@example.com", row.Email);
        Assert.Equal(1, await db.ChurchMembers.CountAsync());
    }

    [Fact]
    public async Task Patch_me_without_member_row_is_rejected()
    {
        var client = AuthedClient(Guid.NewGuid(), "pastor@example.com", "Pastor");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Pastor Only"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        })).StatusCode);

        var patch = await client.PatchAsJsonAsync("/api/me", new
        {
            name = "Should Fail",
            dateOfBirth = "1990-01-01",
        });
        Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);

        await using var db = fx.CreateContext();
        Assert.Equal(0, await db.ChurchMembers.CountAsync());
    }
}
