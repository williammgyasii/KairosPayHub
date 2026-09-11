using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Authorization;
using KairosPayHub.Api.Domain.Attendance;
using KairosPayHub.Api.Domain.Giving;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AbilityMeApiTests : IAsyncLifetime
{
    private readonly PostgresFixture _fx;
    private readonly ApiFactory _factory;

    public AbilityMeApiTests(PostgresFixture fx)
    {
        _fx = fx;
        _factory = new ApiFactory(fx.ConnectionString);
    }

    public Task InitializeAsync() => _fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    HttpClient AuthedClient(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    [Fact]
    public async Task Pastor_me_includes_abilities_and_rules()
    {
        var sub = Guid.NewGuid();
        var client = AuthedClient(sub, "pastor.abilities@example.com", "Pastor");

        await client.PostAsJsonAsync("/api/onboarding", new { countryCode = "GH", churchName = "Ability Church" });
        await client.PutAsJsonAsync("/api/structure/template", new
        {
            name = "Main",
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Zone" },
                new { standardType = "Cell", displayName = "Home group" },
            },
        });

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(me.GetProperty("onboarded").GetBoolean());
        Assert.Equal("ChurchWide", me.GetProperty("leadershipProfile").GetString());

        var abilities = me.GetProperty("abilities").EnumerateArray().Select(a => a.GetString()).ToHashSet();
        Assert.Contains(ProductAbilities.ManageChurch, abilities);
        Assert.Contains(ProductAbilities.ViewMemberGivings, abilities);

        var rules = me.GetProperty("abilityRules").EnumerateArray().ToList();
        Assert.Contains(rules, r =>
            r.GetProperty("action").GetString() == "view"
            && r.GetProperty("subject").GetString() == "MemberGivings");
    }

    [Fact]
    public async Task Cell_leader_on_renamed_leaf_layer_gets_viewMemberGivings()
    {
        var authUserId = Guid.NewGuid();
        await using (var db = _fx.CreateContext())
        {
            var church = StructureSeed.Church("Leaf Church");
            var template = StructureSeed.Template(
                church,
                (StructureLayerType.Fellowship, "District"),
                (StructureLayerType.Cell, "Home group"));
            var fellowshipLayer = template.Layers.OrderBy(l => l.SortOrder).First();
            var cellLayer = template.Layers.OrderBy(l => l.SortOrder).Last();
            var fellowship = StructureSeed.Node(church, fellowshipLayer, "District 1");
            var cell = StructureSeed.Node(church, cellLayer, "Home group A", fellowship);
            db.StructureChurches.Add(church);
            db.StructureTemplates.Add(template);
            db.StructureNodes.AddRange(fellowship, cell);
            db.RoleAssignments.Add(StructureSeed.CellLeaderRole(church, authUserId, cell));
            await db.SaveChangesAsync();
        }

        var client = AuthedClient(authUserId, "home.lead@example.com", "Home Lead");
        var me = await client.GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(me.GetProperty("onboarded").GetBoolean());
        Assert.Equal("CellLeader", me.GetProperty("role").GetString());
        Assert.Equal("Leaf", me.GetProperty("leadershipProfile").GetString());

        var abilities = me.GetProperty("abilities").EnumerateArray().Select(a => a.GetString()).ToHashSet();
        Assert.Contains(ProductAbilities.ViewMemberGivings, abilities);
        Assert.Contains(ProductAbilities.ManageRoster, abilities);
        Assert.DoesNotContain(ProductAbilities.ManageChurch, abilities);
        Assert.NotNull(me.GetProperty("scopeNodeId").GetString());
    }

    [Fact]
    public async Task Fellowship_leader_cannot_mark_when_submission_starts_at_cell()
    {
        var fellowshipAuthId = Guid.NewGuid();
        var cellAuthId = Guid.NewGuid();
        Guid cellLayerId = default;
        Guid fellowshipLayerId = default;

        await using (var db = _fx.CreateContext())
        {
            var church = StructureSeed.Church("Mark Attendance Church");
            var template = StructureSeed.Template(
                church,
                (StructureLayerType.Fellowship, "Fellowship"),
                (StructureLayerType.Cell, "Cell"));
            var fellowshipLayer = template.Layers.OrderBy(l => l.SortOrder).First();
            var cellLayer = template.Layers.OrderBy(l => l.SortOrder).Last();
            fellowshipLayerId = fellowshipLayer.Id;
            cellLayerId = cellLayer.Id;
            var fellowship = StructureSeed.Node(church, fellowshipLayer, "Titans");
            var cell = StructureSeed.Node(church, cellLayer, "Titans Cell", fellowship);
            db.StructureChurches.Add(church);
            db.StructureTemplates.Add(template);
            db.StructureNodes.AddRange(fellowship, cell);
            db.RoleAssignments.Add(StructureSeed.FellowshipLeaderRole(church, fellowshipAuthId, fellowship));
            db.RoleAssignments.Add(StructureSeed.CellLeaderRole(church, cellAuthId, cell));
            db.AttendanceMeetingTypes.Add(new AttendanceMeetingType
            {
                ChurchId = church.Id,
                Title = "Sunday Service",
                RecurrenceKind = AttendanceRecurrenceKind.Weekly,
                DayOfWeek = DayOfWeek.Sunday,
                ScopeKind = ProgramScopeKind.ChurchWide,
                SubmissionLayerId = cellLayer.Id,
                OpensTimeUtc = new TimeOnly(14, 0),
                DeadlineTimeUtc = new TimeOnly(0, 0),
                IsActive = true,
                CreatedByAuthUserId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var fellowshipMe = await AuthedClient(fellowshipAuthId, "jane.fellow@example.com", "Jane")
            .GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(fellowshipMe.GetProperty("onboarded").GetBoolean());
        Assert.Equal("FellowshipLeader", fellowshipMe.GetProperty("role").GetString());
        Assert.False(fellowshipMe.GetProperty("canMarkAttendance").GetBoolean());
        var fellowshipScope = fellowshipMe.GetProperty("rollCallScopes")[0];
        Assert.Equal(fellowshipLayerId, fellowshipScope.GetProperty("layerId").GetGuid());

        var cellMe = await AuthedClient(cellAuthId, "bob.cell@example.com", "Bob")
            .GetFromJsonAsync<JsonElement>("/api/me");
        Assert.True(cellMe.GetProperty("canMarkAttendance").GetBoolean());
        var cellScope = cellMe.GetProperty("rollCallScopes")[0];
        Assert.Equal(cellLayerId, cellScope.GetProperty("layerId").GetGuid());
    }
}
