using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Authorization;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class UnitJoinInviteApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Cell_leader_mints_seven_day_link_and_join_becomes_active_on_accept()
    {
        var setup = await SeedFellowshipAndCellAsync();
        var anon = _factory.CreateClient();

        var mint = await setup.CellClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 7 });
        Assert.Equal(HttpStatusCode.OK, mint.StatusCode);
        var first = await mint.Content.ReadFromJsonAsync<JsonElement>();
        var token = first.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));
        var expiresAt = first.GetProperty("expiresAt").GetDateTimeOffset();
        Assert.InRange(expiresAt, DateTimeOffset.UtcNow.AddDays(6), DateTimeOffset.UtcNow.AddDays(8));

        var preview = await anon.GetFromJsonAsync<JsonElement>($"/api/join/{token}");
        Assert.Equal("Join Church", preview.GetProperty("churchName").GetString());
        Assert.Equal("Cell A", preview.GetProperty("unitName").GetString());

        var submitted = await anon.PostAsJsonAsync(
            $"/api/join/{token}",
            JoinVitals("Ada Pending", "ada.pending@example.com"));
        Assert.Equal(HttpStatusCode.OK, submitted.StatusCode);
        var ack = await submitted.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(ack.GetProperty("submitted").GetBoolean());
        Assert.False(ack.TryGetProperty("id", out _));

        Guid pendingId;
        await using (var db = fx.CreateContext())
        {
            var row = await db.ChurchMembers.SingleAsync(m => m.Email == "ada.pending@example.com");
            Assert.Equal(RosterStatus.Pending, row.RosterStatus);
            Assert.Null(row.AuthUserId);
            pendingId = row.Id;
        }

        var listed = await setup.CellClient.GetFromJsonAsync<JsonElement>("/api/structure/members?pageSize=100");
        Assert.Contains(
            listed.GetProperty("items").EnumerateArray(),
            m => m.GetProperty("id").GetGuid() == pendingId
                 && m.GetProperty("rosterStatus").GetString() == "Pending");
        Assert.Equal("Pending", listed.GetProperty("items")[0].GetProperty("rosterStatus").GetString());
        Assert.True(listed.GetProperty("pendingCount").GetInt32() >= 1);

        var pendingOnly = await setup.CellClient.GetFromJsonAsync<JsonElement>(
            "/api/structure/members?pageSize=100&rosterStatus=Pending");
        Assert.All(
            pendingOnly.GetProperty("items").EnumerateArray(),
            m => Assert.Equal("Pending", m.GetProperty("rosterStatus").GetString()));

        var tree = await setup.Pastor.GetFromJsonAsync<JsonElement>("/api/structure?includeMembers=true");
        Assert.Contains(
            tree.GetProperty("members").EnumerateArray(),
            m => m.GetProperty("id").GetGuid() == pendingId);

        var cellTree = await setup.CellClient.GetFromJsonAsync<JsonElement>("/api/structure?includeMembers=false");
        Assert.Contains(
            cellTree.GetProperty("nodes").EnumerateArray(),
            n => n.GetProperty("id").GetGuid() == setup.FellowshipId);

        var dashboard = await setup.CellClient.GetFromJsonAsync<JsonElement>("/api/giving/dashboard");
        Assert.Equal(1, dashboard.GetProperty("memberCount").GetInt32());

        var accept = await setup.CellClient.PostAsync(
            $"/api/structure/members/{pendingId}/accept-join",
            null);
        Assert.Equal(HttpStatusCode.OK, accept.StatusCode);
        var accepted = await accept.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Active", accepted.GetProperty("rosterStatus").GetString());

        await using (var db = fx.CreateContext())
        {
            var row = await db.ChurchMembers.SingleAsync(m => m.Id == pendingId);
            Assert.Equal(RosterStatus.Active, row.RosterStatus);
            Assert.Null(row.AuthUserId);
        }

        var after = await setup.CellClient.GetFromJsonAsync<JsonElement>("/api/giving/dashboard");
        Assert.Equal(2, after.GetProperty("memberCount").GetInt32());
    }

    [Fact]
    public async Task Mid_layer_leader_cannot_mint_and_cell_leader_cannot_type_add()
    {
        var setup = await SeedFellowshipAndCellAsync();

        var fellowshipMint = await setup.FellowshipClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 7 });
        Assert.Equal(HttpStatusCode.Forbidden, fellowshipMint.StatusCode);

        var ownMint = await setup.FellowshipClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.FellowshipId}/join-invite",
            new { expiresInDays = 7 });
        Assert.Equal(HttpStatusCode.Forbidden, ownMint.StatusCode);

        var pastorMint = await setup.Pastor.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 7 });
        Assert.Equal(HttpStatusCode.Forbidden, pastorMint.StatusCode);

        var typed = await setup.CellClient.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Typed In",
            parentNodeId = setup.CellId,
            dateOfBirth = "2000-01-01",
        });
        Assert.Equal(HttpStatusCode.BadRequest, typed.StatusCode);
    }

    [Fact]
    public async Task Rotate_and_expiry_reject_the_old_token()
    {
        var setup = await SeedFellowshipAndCellAsync();
        var anon = _factory.CreateClient();

        var firstMint = await setup.CellClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 1 });
        var firstToken = (await firstMint.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();

        var secondMint = await setup.CellClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 30 });
        var secondToken = (await secondMint.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        Assert.NotEqual(firstToken, secondToken);

        var rotatedGet = await anon.GetAsync($"/api/join/{firstToken}");
        Assert.Equal(HttpStatusCode.BadRequest, rotatedGet.StatusCode);
        Assert.Contains("new link", await rotatedGet.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        var rotatedPost = await anon.PostAsJsonAsync(
            $"/api/join/{firstToken}",
            JoinVitals("Too Late", "too.late@example.com"));
        Assert.Equal(HttpStatusCode.BadRequest, rotatedPost.StatusCode);

        await using (var db = fx.CreateContext())
        {
            var live = await db.UnitJoinInvites.SingleAsync(i => i.NodeId == setup.CellId);
            live.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        var expired = await anon.PostAsJsonAsync(
            $"/api/join/{secondToken}",
            JoinVitals("Expired", "expired.join@example.com"));
        Assert.Equal(HttpStatusCode.BadRequest, expired.StatusCode);
        Assert.Equal(0, await CountNamedMembersAsync("Expired"));
    }

    [Fact]
    public async Task Existing_roster_email_is_not_an_oracle()
    {
        var setup = await SeedFellowshipAndCellAsync();
        var anon = _factory.CreateClient();
        var token = await MintTokenAsync(setup.CellClient, setup.CellId);

        var before = await CountEmailAsync("cl.join@example.com");
        var response = await anon.PostAsJsonAsync(
            $"/api/join/{token}",
            JoinVitals("Clone", "cl.join@example.com"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("already", body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(before, await CountEmailAsync("cl.join@example.com"));
    }

    [Fact]
    public async Task Pending_cap_rejects_further_submits()
    {
        var setup = await SeedFellowshipAndCellAsync();
        var token = await MintTokenAsync(setup.CellClient, setup.CellId);
        await using (var db = fx.CreateContext())
        {
            var churchId = await db.StructureNodes
                .Where(n => n.Id == setup.CellId)
                .Select(n => n.ChurchId)
                .SingleAsync();
            for (var i = 0; i < UnitJoinInviteService.MaxPendingPerUnit; i++)
            {
                db.ChurchMembers.Add(new Member
                {
                    ChurchId = churchId,
                    ParentNodeId = setup.CellId,
                    Name = $"Pending {i}",
                    Email = $"pending{i}@example.com",
                    RosterStatus = RosterStatus.Pending,
                    CreatedAt = DateTimeOffset.UtcNow,
                });
            }

            await db.SaveChangesAsync();
        }

        var blocked = await _factory.CreateClient().PostAsJsonAsync(
            $"/api/join/{token}",
            JoinVitals("Overflow", "overflow@example.com"));
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("new link", await blocked.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, await CountNamedMembersAsync("Overflow"));
    }

    [Fact]
    public async Task Sixth_submit_on_the_same_token_is_rate_limited()
    {
        var setup = await SeedFellowshipAndCellAsync();
        var anon = _factory.CreateClient();
        var token = await MintTokenAsync(setup.CellClient, setup.CellId);

        for (var i = 0; i < 5; i++)
        {
            var ok = await anon.PostAsJsonAsync(
                $"/api/join/{token}",
                JoinVitals($"Flood {i}", $"flood{i}@example.com"));
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }

        var limited = await anon.PostAsJsonAsync(
            $"/api/join/{token}",
            JoinVitals("Flood 5", "flood5@example.com"));
        Assert.Equal((HttpStatusCode)429, limited.StatusCode);
        Assert.Equal(0, await CountNamedMembersAsync("Flood 5"));
    }

    [Fact]
    public async Task Manage_roster_overlay_blocks_join_and_member_writes()
    {
        var setup = await SeedFellowshipAndCellAsync();
        await using (var db = fx.CreateContext())
        {
            var cellLayerId = await db.StructureNodes
                .Where(n => n.Id == setup.CellId)
                .Select(n => n.LayerId)
                .SingleAsync();
            var overlay = await setup.Pastor.PutAsJsonAsync("/api/access", new
            {
                changes = new[]
                {
                    new
                    {
                        subjectKind = "layer",
                        subjectId = cellLayerId,
                        ability = ProductAbilities.ManageRoster,
                        enabled = false,
                    },
                },
            });
            Assert.Equal(HttpStatusCode.OK, overlay.StatusCode);
        }

        var mint = await setup.CellClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 7 });
        Assert.Equal(HttpStatusCode.Forbidden, mint.StatusCode);

        var typed = await setup.CellClient.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Typed In",
            parentNodeId = setup.CellId,
            dateOfBirth = "2000-01-01",
        });
        Assert.Equal(HttpStatusCode.Forbidden, typed.StatusCode);
    }

    [Fact]
    public async Task Decline_removes_the_pending_row()
    {
        var setup = await SeedFellowshipAndCellAsync();
        var anon = _factory.CreateClient();

        var token = (await (await setup.CellClient.PostAsJsonAsync(
            $"/api/structure/nodes/{setup.CellId}/join-invite",
            new { expiresInDays = 7 })).Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString();

        var declineSubmit = await anon.PostAsJsonAsync(
            $"/api/join/{token}",
            JoinVitals("Bo Decline", "bo.decline@example.com"));
        Assert.Equal(HttpStatusCode.OK, declineSubmit.StatusCode);
        Guid pendingId;
        await using (var db = fx.CreateContext())
            pendingId = await db.ChurchMembers
                .Where(m => m.Email == "bo.decline@example.com")
                .Select(m => m.Id)
                .SingleAsync();

        var decline = await setup.CellClient.PostAsync(
            $"/api/structure/members/{pendingId}/decline-join",
            null);
        Assert.Equal(HttpStatusCode.NoContent, decline.StatusCode);
        Assert.Equal(0, await CountNamedMembersAsync("Bo Decline"));
    }

    private async Task<int> CountNamedMembersAsync(string name)
    {
        await using var db = fx.CreateContext();
        return await db.ChurchMembers.CountAsync(m => m.Name == name);
    }

    private async Task<int> CountEmailAsync(string email)
    {
        await using var db = fx.CreateContext();
        var normalized = email.ToUpperInvariant();
        return await db.ChurchMembers.CountAsync(m => m.Email != null && m.Email.ToUpper() == normalized);
    }

    private static async Task<string> MintTokenAsync(HttpClient client, Guid nodeId)
    {
        var mint = await client.PostAsJsonAsync(
            $"/api/structure/nodes/{nodeId}/join-invite",
            new { expiresInDays = 7 });
        Assert.Equal(HttpStatusCode.OK, mint.StatusCode);
        return (await mint.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;
    }

    private static object JoinVitals(string name, string email) => new
    {
        name,
        email,
        phone = "+14437622773",
        dateOfBirth = "1998-06-01",
        residence = "12 Oak St",
    };

    private async Task<JoinSetup> SeedFellowshipAndCellAsync()
    {
        var pastor = AuthedClient(Guid.NewGuid(), "pastor.join@example.com", "Pastor");
        await pastor.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("Join Church"));
        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });
        var layers = (await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template"))!.GetProperty("layers");
        var fellowshipLayerId = layers[0].GetProperty("id").GetGuid();
        var cellLayerId = layers[1].GetProperty("id").GetGuid();

        var fellowshipCreated = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
            name = "Titans",
            newLeader = new
            {
                name = "FL Join",
                email = "fl.join@example.com",
                phone = "+14437622773",
                dateOfBirth = "1995-03-15",
            },
        });
        Assert.Equal(HttpStatusCode.OK, fellowshipCreated.StatusCode);
        var fellowshipId = (await fellowshipCreated.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var cellCreated = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "CL Join",
                email = "cl.join@example.com",
                phone = "+14437622773",
                dateOfBirth = "1994-01-15",
                leaderIsCellLeader = true,
            },
        });
        Assert.Equal(HttpStatusCode.OK, cellCreated.StatusCode);
        var cellId = (await cellCreated.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var flAuth = await db.ChurchMembers
            .Where(m => m.Email == "fl.join@example.com")
            .Select(m => m.AuthUserId)
            .SingleAsync();
        var clAuth = await db.ChurchMembers
            .Where(m => m.Email == "cl.join@example.com")
            .Select(m => m.AuthUserId)
            .SingleAsync();

        return new JoinSetup(
            pastor,
            AuthedClient(flAuth!.Value, "fl.join@example.com", "FL Join"),
            AuthedClient(clAuth!.Value, "cl.join@example.com", "CL Join"),
            fellowshipId,
            cellId);
    }

    private HttpClient AuthedClient(Guid sub, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    private sealed record JoinSetup(
        HttpClient Pastor,
        HttpClient FellowshipClient,
        HttpClient CellClient,
        Guid FellowshipId,
        Guid CellId);
}
