using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureTemplateApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "pastor@example.com");
        client.DefaultRequestHeaders.Add("X-Test-Name", "Pastor");
        return client;
    }

    private HttpClient ClientForAuthUser(Guid authUserId, string email, string name)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", authUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        client.DefaultRequestHeaders.Add("X-Test-Name", name);
        return client;
    }

    private static async Task OnboardAsync(HttpClient client, string churchName = "Grace Assembly")
    {
        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { churchName });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);
    }

    private static async Task<JsonElement> PutTemplateAsync(
        HttpClient client,
        params (string type, string label)[] layers)
        => await PutTemplateAsync(client, null, layers);

    private static async Task<JsonElement> PutTemplateAsync(
        HttpClient client,
        string? name,
        params (string type, string label)[] layers)
    {
        var body = new
        {
            name,
            layers = layers.Select(l => new { standardType = l.type, displayName = l.label }).ToArray(),
        };
        var response = await client.PutAsJsonAsync("/api/structure/template", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>())!;
    }

    [Fact]
    public async Task Delete_template_requires_empty_roster()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var template = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();

        await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC One",
        });

        var blocked = await client.DeleteAsync("/api/structure/template");
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
    }

    [Fact]
    public async Task Delete_template_when_roster_empty()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await PutTemplateAsync(client, ("Fellowship", "Fellowship"), ("Cell", "Cell"));

        var deleted = await client.DeleteAsync("/api/structure/template");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var missing = await client.GetAsync("/api/structure/template");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Template_is_missing_until_pastor_defines_it()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var missing = await client.GetAsync("/api/structure/template");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.True(tree.GetProperty("template").ValueKind == JsonValueKind.Null);
    }

    [Fact]
    public async Task Put_template_persists_name()
    {
        var client = PastorClient();
        await OnboardAsync(client, "Named Church");

        var template = await PutTemplateAsync(
            client,
            "Main structure",
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        Assert.Equal("Main structure", template.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Pastor_can_define_standard_Pfcc_Fellowship_Cell_chain()
    {
        var client = PastorClient();
        await OnboardAsync(client, "City Church");

        var template = await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        Assert.Equal(3, template.GetProperty("layers").GetArrayLength());
        Assert.Equal("PFCC", template.GetProperty("layers")[0].GetProperty("standardType").GetString());
        Assert.Equal("Cell", template.GetProperty("layers")[2].GetProperty("standardType").GetString());
    }

    [Fact]
    public async Task Pastor_can_define_group_chain_with_custom_labels()
    {
        var client = PastorClient();
        await OnboardAsync(client, "Group Church");

        var template = await PutTemplateAsync(
            client,
            ("Group", "Sect"),
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        Assert.Equal(4, template.GetProperty("layers").GetArrayLength());
        Assert.Equal("Sect", template.GetProperty("layers")[0].GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task Template_must_end_with_cell_layer()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var response = await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "PFCC", displayName = "PFCC" },
                new { standardType = "Fellowship", displayName = "Fellowship" },
            },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Cannot_create_node_without_template()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var response = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = Guid.NewGuid(),
            parentNodeId = (Guid?)null,
            name = "Orphan",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Pastor_builds_standard_hierarchy_via_nodes()
    {
        var client = PastorClient();
        await OnboardAsync(client, "Standard Church");

        var template = await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[2].GetProperty("id").GetGuid();

        var pfcc = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC One",
        });
        var pfccId = (await pfcc.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowship = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Wally Fellowship",
        });
        var fellowshipId = (await fellowship.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cell = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Josh Cell",
        });
        var cellId = (await cell.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var member = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay",
            parentNodeId = cellId,
            email = "kay@example.com",
        });
        Assert.Equal(HttpStatusCode.OK, member.StatusCode);

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal("Standard Church", tree.GetProperty("churchName").GetString());
        Assert.Equal(3, tree.GetProperty("nodes").GetArrayLength());
        Assert.Equal(1, tree.GetProperty("members").GetArrayLength());
        Assert.Equal("Kay", tree.GetProperty("members")[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task Pastor_builds_group_first_hierarchy()
    {
        var client = PastorClient();
        await OnboardAsync(client, "Layered Church");

        var template = await PutTemplateAsync(
            client,
            ("Group", "Sect"),
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = template.GetProperty("layers");
        var groupLayerId = layers[0].GetProperty("id").GetGuid();
        var pfccLayerId = layers[1].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[2].GetProperty("id").GetGuid();
        var cellLayerId = layers[3].GetProperty("id").GetGuid();

        var groupId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = groupLayerId,
            parentNodeId = (Guid?)null,
            name = "North Sect",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = groupId,
            name = "PFCC A",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Fellowship 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var member = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Sam",
            parentNodeId = cellId,
        });
        Assert.Equal(HttpStatusCode.OK, member.StatusCode);

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal(4, tree.GetProperty("nodes").GetArrayLength());
    }

    [Fact]
    public async Task Member_must_attach_to_deepest_layer_only()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var template = await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var response = await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Too High",
            parentNodeId = pfccId,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Cannot_change_template_after_nodes_exist()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        var template = await PutTemplateAsync(
            client,
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
            name = "Fellowship A",
        });

        var response = await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "PFCC", displayName = "PFCC" },
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Pastor_can_relink_node_and_member()
    {
        var client = PastorClient();
        await OnboardAsync(client, "Move Church");

        var template = await PutTemplateAsync(
            client,
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipA = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
            name = "A",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipB = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
            name = "B",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipA,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Sam",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cellLink = await client.PatchAsJsonAsync(
            $"/api/structure/nodes/{cellId}/link",
            new { parentNodeId = fellowshipB });
        Assert.Equal(HttpStatusCode.OK, cellLink.StatusCode);

        var cellBId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipB,
            name = "Cell 2",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberLink = await client.PatchAsJsonAsync(
            $"/api/structure/members/{memberId}/link",
            new { parentNodeId = cellBId });
        Assert.Equal(HttpStatusCode.OK, memberLink.StatusCode);

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal(fellowshipB, tree.GetProperty("nodes").EnumerateArray()
            .Single(n => n.GetProperty("id").GetGuid() == cellId).GetProperty("parentNodeId").GetGuid());
        Assert.Equal(cellBId, tree.GetProperty("members")[0].GetProperty("parentNodeId").GetGuid());
    }

    [Fact]
    public async Task Update_member_profile_and_placement()
    {
        var client = PastorClient();
        await OnboardAsync(client);
        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await client.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();
        var cellLayerId = layers[2].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "F1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cell2Id = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 2",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Sam",
            phone = "555-0100",
            age = 30,
            position = "Member",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var update = await client.PatchAsJsonAsync(
            $"/api/structure/members/{memberId}",
            new
            {
                name = "Samuel",
                phone = "555-0199",
                age = 31,
                position = "CellLeader",
                parentNodeId = cell2Id,
            });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var updated = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Samuel", updated.GetProperty("name").GetString());
        Assert.Equal("555-0199", updated.GetProperty("phone").GetString());
        Assert.Equal(31, updated.GetProperty("age").GetInt32());
        Assert.Equal("CellLeader", updated.GetProperty("position").GetString());
        Assert.Equal(cell2Id, updated.GetProperty("parentNodeId").GetGuid());
    }

    [Fact]
    public async Task Pastor_can_delete_member_without_contributions()
    {
        var client = PastorClient();
        await OnboardAsync(client);
        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await client.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();
        var cellLayerId = layers[2].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Remove Me",
            phone = "555-0101",
            age = 22,
            position = "Member",
            parentNodeId = cellId,
            responsiveness = 4,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var delete = await client.DeleteAsync($"/api/structure/members/{memberId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.DoesNotContain(
            tree.GetProperty("members").EnumerateArray(),
            member => member.GetProperty("id").GetGuid() == memberId);
    }

    [Fact]
    public async Task Fellowship_leader_can_update_member_in_scope()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);
        await PutTemplateAsync(
            pastor,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();
        var cellLayerId = layers[2].GetProperty("id").GetGuid();

        var pfccId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.fellowship-edit@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay Mensah",
            phone = "555-0101",
            age = 22,
            position = "Member",
            parentNodeId = cellId,
            responsiveness = 3,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var leader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship-edit@example.com");
        Assert.NotNull(leader.AuthUserId);

        var fellowshipClient = ClientForAuthUser(
            leader.AuthUserId!.Value,
            "jane.fellowship-edit@example.com",
            "Jane Leader");

        var updated = await fellowshipClient.PatchAsJsonAsync($"/api/structure/members/{memberId}", new
        {
            name = "Kay Mensah (updated)",
            phone = "555-0199",
            age = 23,
            position = "Member",
            parentNodeId = cellId,
            responsiveness = 5,
        });

        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var body = await updated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Kay Mensah (updated)", body.GetProperty("name").GetString());
        Assert.Equal(5, body.GetProperty("responsiveness").GetInt32());
    }

    [Fact]
    public async Task Fellowship_leader_cannot_update_member_outside_scope()
    {
        var pastor = PastorClient();
        await OnboardAsync(pastor);
        await PutTemplateAsync(
            pastor,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();
        var cellLayerId = layers[2].GetProperty("id").GetGuid();

        var pfccId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipAId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.fellowship-scope@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipBId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Warriors",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellAId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipAId,
            name = "Cell A",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellBId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipBId,
            name = "Cell B",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Outside Member",
            parentNodeId = cellBId,
            position = "Member",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var leader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship-scope@example.com");
        Assert.NotNull(leader.AuthUserId);

        var fellowshipClient = ClientForAuthUser(
            leader.AuthUserId!.Value,
            "jane.fellowship-scope@example.com",
            "Jane Leader");

        var blocked = await fellowshipClient.PatchAsJsonAsync($"/api/structure/members/{memberId}", new
        {
            name = "Blocked edit",
            parentNodeId = cellBId,
            position = "Member",
        });

        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        _ = cellAId;
    }

    [Fact]
    public async Task Create_fellowship_with_leader_email_returns_generated_login()
    {
        var client = PastorClient();
        await OnboardAsync(client);
        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await client.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var create = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Fellowship 1",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.leader@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                residence = "Accra, East Legon",
                occupationStatus = "Student",
                schoolOrWorkplace = "University of Ghana",
            },
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var body = await create.Content.ReadFromJsonAsync<JsonElement>();
        var login = body.GetProperty("generatedLeaderLogin");
        var password = login.GetProperty("temporaryPassword").GetString();
        Assert.Equal("jane.leader@example.com", login.GetProperty("email").GetString());
        Assert.False(string.IsNullOrWhiteSpace(password));

        Assert.Equal("jane.leader@example.com", _factory.Email.LastTo);
        Assert.Contains(password, _factory.Email.LastBody);
        Assert.Contains("http://localhost:5173/login", _factory.Email.LastBody);
        Assert.Contains("change your password", _factory.Email.LastBody, StringComparison.OrdinalIgnoreCase);

        await using var db = fx.CreateContext();
        var member = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.leader@example.com");
        Assert.NotNull(member.AuthUserId);
        Assert.Equal("+233241234567", member.Phone);
        Assert.Equal(new DateOnly(1995, 3, 15), member.DateOfBirth);
        Assert.Equal("Accra, East Legon", member.Residence);
        Assert.Equal(MemberOccupationStatus.Student, member.OccupationStatus);
        Assert.Equal("University of Ghana", member.SchoolOrWorkplace);
        Assert.Equal(1, await db.RoleAssignments.CountAsync(r => r.Role == ChurchRole.FellowshipLeader));
        Assert.Equal(1, await db.RoleAssignments.CountAsync(r => r.Role == ChurchRole.CellLeader));

        var fellowshipId = body.GetProperty("node").GetProperty("id").GetGuid();
        var autoCell = await db.StructureNodes.SingleAsync(n =>
            n.ParentNodeId == fellowshipId && n.LayerId == layers[2].GetProperty("id").GetGuid());
        Assert.Equal("Fellowship 1 Cell", autoCell.Name);
        Assert.Equal(member.Id, autoCell.LeaderMemberId);
        Assert.Equal(autoCell.Id, member.ParentNodeId);
        Assert.Equal(MemberPosition.FellowshipLeader, member.Position);
    }

    [Fact]
    public async Task Create_fellowship_with_incomplete_leader_profile_returns_bad_request()
    {
        var client = PastorClient();
        await OnboardAsync(client);
        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await client.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var create = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Fellowship 1",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.leader@example.com",
            },
        });

        Assert.Equal(HttpStatusCode.BadRequest, create.StatusCode);
    }

    [Fact]
    public async Task Create_fellowship_when_leader_is_not_cell_leader_returns_bad_request()
    {
        var client = PastorClient();
        await OnboardAsync(client);
        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await client.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var create = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans Fellowship",
            newLeader = new
            {
                name = "Josh",
                email = "josh@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = false,
            },
        });

        Assert.Equal(HttpStatusCode.BadRequest, create.StatusCode);
        var body = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("first cell", body.GetProperty("error").GetString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Delete_node_cascades_to_child_units_and_members()
    {
        var client = PastorClient();
        await OnboardAsync(client);
        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var layers = (await client.GetFromJsonAsync<JsonElement>("/api/structure/template"))
            .GetProperty("layers");
        var pfccLayerId = layers[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = layers[1].GetProperty("id").GetGuid();
        var cellLayerId = layers[2].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Fellowship 1",
            newLeader = new
            {
                name = "Jane Leader",
                email = "jane.leader@example.com",
                phone = "+233241234567",
                dateOfBirth = "1990-01-01",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 2",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Sam Member",
            parentNodeId = cellId,
            position = "Member",
        });

        var delete = await client.DeleteAsync($"/api/structure/nodes/{fellowshipId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        await using var db = fx.CreateContext();
        Assert.False(await db.StructureNodes.AnyAsync(n => n.Id == fellowshipId));
        Assert.False(await db.StructureNodes.AnyAsync(n => n.Id == cellId));
        Assert.False(await db.ChurchMembers.AnyAsync(m => m.Name == "Jane Leader" || m.Name == "Sam Member"));

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal(1, tree.GetProperty("nodes").GetArrayLength());
        Assert.Empty(tree.GetProperty("members").EnumerateArray());
    }

    [Fact]
    public async Task Onboarding_creates_church_tenant_and_pastor_role()
    {
        var client = PastorClient();
        var onboard = await client.PostAsJsonAsync("/api/onboarding", new { churchName = "Grace Assembly" });
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);

        var body = await onboard.Content.ReadFromJsonAsync<JsonElement>();
        var churchId = body.GetProperty("churchId").GetGuid();

        await using var db = fx.CreateContext();
        Assert.Equal(1, await db.StructureChurches.CountAsync());
        Assert.Equal(1, await db.RoleAssignments.CountAsync(r => r.ChurchId == churchId));
        Assert.Equal("Pastor", (await db.RoleAssignments.SingleAsync()).Role.ToString());
    }

    private static async Task<JsonElement> EvolveTemplateAsync(
        HttpClient client,
        object body)
    {
        var response = await client.PostAsJsonAsync("/api/structure/template/evolve", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>())!;
    }

    [Fact]
    public async Task Evolve_rename_updates_display_names_when_roster_exists()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var template = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();

        await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        });

        var dryRun = await EvolveTemplateAsync(client, new
        {
            operation = "rename",
            name = "Main structure",
            layers = new[]
            {
                new { standardType = "PFCC", displayName = "Pastoral Unit" },
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
            dryRun = true,
        });

        Assert.False(dryRun.GetProperty("applied").GetBoolean());
        Assert.Equal("PFCC → Pastoral Unit", dryRun.GetProperty("preview").GetProperty("details")[0].GetString());

        var applied = await EvolveTemplateAsync(client, new
        {
            operation = "rename",
            name = "Main structure",
            layers = new[]
            {
                new { standardType = "PFCC", displayName = "Pastoral Unit" },
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
            dryRun = false,
        });

        Assert.True(applied.GetProperty("applied").GetBoolean());
        var updated = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        Assert.Equal("Pastoral Unit", updated.GetProperty("layers")[0].GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task Evolve_insertAt_auto_bridges_zone_between_pfcc_and_fellowship()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var template = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[2].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay",
            parentNodeId = cellId,
        });

        var preview = await EvolveTemplateAsync(client, new
        {
            operation = "insertAt",
            atSortOrder = 1,
            layer = new { standardType = "Group", displayName = "Zone" },
            dryRun = true,
        });

        Assert.Equal(1, preview.GetProperty("preview").GetProperty("bridgeNodesCreated").GetInt32());
        Assert.Equal(1, preview.GetProperty("preview").GetProperty("nodesReparented").GetInt32());
        Assert.Equal(0, preview.GetProperty("preview").GetProperty("membersMoved").GetInt32());

        await EvolveTemplateAsync(client, new
        {
            operation = "insertAt",
            atSortOrder = 1,
            layer = new { standardType = "Group", displayName = "Zone" },
            dryRun = false,
        });

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal(4, tree.GetProperty("template").GetProperty("layers").GetArrayLength());
        Assert.Equal(4, tree.GetProperty("nodes").GetArrayLength());

        var zoneLayerId = tree.GetProperty("template").GetProperty("layers")[1].GetProperty("id").GetString();
        var zoneNode = tree.GetProperty("nodes").EnumerateArray()
            .Single(n => n.GetProperty("layerId").GetString() == zoneLayerId);

        Assert.Equal(pfccId.ToString(), zoneNode.GetProperty("parentNodeId").GetString());
        Assert.Equal(
            zoneNode.GetProperty("id").GetString(),
            tree.GetProperty("nodes").EnumerateArray()
                .Single(n => n.GetProperty("id").GetString() == fellowshipId.ToString())
                .GetProperty("parentNodeId").GetString());

        var member = tree.GetProperty("members")[0];
        Assert.Equal(cellId.ToString(), member.GetProperty("parentNodeId").GetString());
    }

    [Fact]
    public async Task Evolve_appendTop_auto_bridges_group_above_pfcc()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var template = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "North PFCC",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await EvolveTemplateAsync(client, new
        {
            operation = "appendTop",
            layer = new { standardType = "Group", displayName = "Sect" },
            dryRun = false,
        });

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal(4, tree.GetProperty("template").GetProperty("layers").GetArrayLength());
        Assert.Equal("Sect", tree.GetProperty("template").GetProperty("layers")[0].GetProperty("displayName").GetString());

        var sectLayerId = tree.GetProperty("template").GetProperty("layers")[0].GetProperty("id").GetString();
        var pfccNode = tree.GetProperty("nodes").EnumerateArray()
            .Single(n => n.GetProperty("id").GetString() == pfccId.ToString());
        var sectNode = tree.GetProperty("nodes").EnumerateArray()
            .Single(n => n.GetProperty("layerId").GetString() == sectLayerId);

        Assert.Null(sectNode.GetProperty("parentNodeId").ValueKind == JsonValueKind.Null
            ? null
            : sectNode.GetProperty("parentNodeId").GetString());
        Assert.Equal(JsonValueKind.Null, sectNode.GetProperty("parentNodeId").ValueKind);
        Assert.Equal(sectNode.GetProperty("id").GetString(), pfccNode.GetProperty("parentNodeId").GetString());
    }

    [Fact]
    public async Task Evolve_appendBeforeMember_moves_members_to_new_deepest_layer()
    {
        var client = PastorClient();
        await OnboardAsync(client);

        await PutTemplateAsync(
            client,
            ("PFCC", "PFCC"),
            ("Fellowship", "Fellowship"),
            ("Cell", "Cell"));

        var template = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[2].GetProperty("id").GetGuid();

        var pfccId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            parentNodeId = (Guid?)null,
            name = "PFCC 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell 1",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        await client.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Kay",
            parentNodeId = cellId,
        });

        await EvolveTemplateAsync(client, new
        {
            operation = "appendBeforeMember",
            layer = new { standardType = "Cell", displayName = "Member unit" },
            dryRun = false,
        });

        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure");
        Assert.Equal(4, tree.GetProperty("template").GetProperty("layers").GetArrayLength());
        Assert.Equal(
            "Member unit",
            tree.GetProperty("template").GetProperty("layers")[3].GetProperty("displayName").GetString());

        var memberUnitLayerId = tree.GetProperty("template").GetProperty("layers")[3].GetProperty("id").GetString();
        var member = tree.GetProperty("members")[0];
        var memberParentId = member.GetProperty("parentNodeId").GetString();
        var memberParent = tree.GetProperty("nodes").EnumerateArray()
            .Single(n => n.GetProperty("id").GetString() == memberParentId);

        Assert.Equal(memberUnitLayerId, memberParent.GetProperty("layerId").GetString());
        Assert.Equal(cellId.ToString(), memberParent.GetProperty("parentNodeId").GetString());
    }
}
