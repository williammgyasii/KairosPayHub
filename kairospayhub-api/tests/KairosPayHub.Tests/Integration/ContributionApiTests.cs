using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ContributionApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    private HttpClient PastorClient(string? sub = null)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub ?? Guid.NewGuid().ToString());
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

    [Fact]
    public async Task Cell_leader_logs_contribution_fellowship_leader_approves_pastor_sees_rollup()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Giving Church" });

        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = (Guid?)null,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.fellowship@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        });
        var fellowshipId = (await fellowshipResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var cellResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.cell@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        });
        var cellId = (await cellResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var memberResp = await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
            email = "kay@example.com",
        });
        var memberId = (await memberResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.cell@example.com");
        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship@example.com");
        Assert.NotNull(cellLeader.AuthUserId);
        Assert.NotNull(fellowshipLeader.AuthUserId);

        var programResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var programId = (await programResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(
            cellLeader.AuthUserId!.Value,
            "bob.cell@example.com",
            "Bob Cell");

        var create = await cellClient.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
        {
            memberId,
            amount = 100m,
            currency = "GHS",
            dateSent = "2026-08-01T00:00:00Z",
            attachmentKey = "giving/test/receipt.jpg",
            notes = "August seed",
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var contribution = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PendingApproval", contribution.GetProperty("status").GetString());
        Assert.Equal("CellLeader", contribution.GetProperty("enteredByRole").GetString());
        Assert.Equal("FellowshipLeader", contribution.GetProperty("pendingApproverRole").GetString());
        Assert.Equal("https://fake.test/giving/test/receipt.jpg", contribution.GetProperty("attachmentUrl").GetString());
        var contributionId = contribution.GetProperty("id").GetGuid();

        var fellowshipClient = ClientForAuthUser(
            fellowshipLeader.AuthUserId!.Value,
            "jane.fellowship@example.com",
            "Jane Fellowship");

        var pending = await fellowshipClient.GetFromJsonAsync<JsonElement>(
            $"/api/giving/programs/{programId}/contributions?status=PendingApproval");
        Assert.Equal(1, pending.GetProperty("contributions").GetArrayLength());

        var approve = await fellowshipClient.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var rollup = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{programId}/rollup");
        Assert.Equal(100m, rollup.GetProperty("totalApprovedAmount").GetDecimal());
        Assert.Equal(1, rollup.GetProperty("totalApprovedCount").GetInt32());
        Assert.True(rollup.GetProperty("rows").GetArrayLength() >= 1);
    }

    [Fact]
    public async Task Fellowship_leader_cannot_approve_outside_scope()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Scope Church" });

        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var f1 = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "F1",
            newLeader = new
            {
                name = "Leader F1",
                email = "f1@example.com",
                phone = "+233241111111",
                dateOfBirth = "1992-01-10",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var f2 = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "F2",
            newLeader = new
            {
                name = "Leader F2",
                email = "f2@example.com",
                phone = "+233242222222",
                dateOfBirth = "1993-02-11",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellInF2 = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = f2,
            name = "Cell F2",
            newLeader = new
            {
                name = "Cell L",
                email = "cell@example.com",
                phone = "+233243333333",
                dateOfBirth = "1994-03-12",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Out of scope member",
            parentNodeId = cellInF2,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "cell@example.com");
        var f1Leader = await db.ChurchMembers.SingleAsync(m => m.Email == "f1@example.com");

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(cellLeader.AuthUserId!.Value, "cell@example.com", "Cell L");
        var contributionId = (await (await cellClient.PostAsJsonAsync(
            $"/api/giving/programs/{programId}/contributions",
            new
            {
                memberId,
                amount = 50m,
                dateSent = "2026-08-01T00:00:00Z",
                attachmentKey = "giving/test/receipt2.jpg",
            })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var f1Client = ClientForAuthUser(f1Leader.AuthUserId!.Value, "f1@example.com", "Leader F1");
        var blocked = await f1Client.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
    }

    [Fact]
    public async Task Pastor_cannot_approve_cell_leader_contribution()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Pastor Scope Church" });

        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var fellowshipLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.fellowship@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.cell@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var cellLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "bob.cell@example.com");

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cellClient = ClientForAuthUser(cellLeader.AuthUserId!.Value, "bob.cell@example.com", "Bob Cell");
        var contributionId = (await (await cellClient.PostAsJsonAsync(
            $"/api/giving/programs/{programId}/contributions",
            new
            {
                memberId,
                amount = 100m,
                dateSent = "2026-08-01T00:00:00Z",
                attachmentKey = "giving/test/receipt.jpg",
            })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var blocked = await pastor.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
    }

    [Fact]
    public async Task Pfcc_manager_logs_contribution_pastor_approves()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "PFCC Giving Church" });

        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "PFCC", displayName = "PFCC" },
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var template = await pastor.GetFromJsonAsync<JsonElement>("/api/structure/template");
        var pfccLayerId = template.GetProperty("layers")[0].GetProperty("id").GetGuid();
        var fellowshipLayerId = template.GetProperty("layers")[1].GetProperty("id").GetGuid();
        var cellLayerId = template.GetProperty("layers")[2].GetProperty("id").GetGuid();

        var pfccId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = pfccLayerId,
            name = "PFCC 1",
            newLeader = new
            {
                name = "Paul PFCC",
                email = "paul.pfcc@example.com",
                phone = "+233241111111",
                dateOfBirth = "1988-01-01",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var fellowshipId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = fellowshipLayerId,
            parentNodeId = pfccId,
            name = "Titans",
            newLeader = new
            {
                name = "Jane Fellowship",
                email = "jane.fellowship@example.com",
                phone = "+233241234567",
                dateOfBirth = "1995-03-15",
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var cellId = (await (await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = cellLayerId,
            parentNodeId = fellowshipId,
            name = "Cell A",
            newLeader = new
            {
                name = "Bob Cell",
                email = "bob.cell@example.com",
                phone = "+233241234568",
                dateOfBirth = "1990-06-20",
                leaderIsCellLeader = true,
            },
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Member Kay",
            parentNodeId = cellId,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await using var db = fx.CreateContext();
        var pfccManager = await db.ChurchMembers.SingleAsync(m => m.Email == "paul.pfcc@example.com");
        Assert.NotNull(pfccManager.AuthUserId);

        var programId = (await (await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Rhapsody 2026",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var pfccClient = ClientForAuthUser(
            pfccManager.AuthUserId!.Value,
            "paul.pfcc@example.com",
            "Paul PFCC");

        var create = await pfccClient.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
        {
            memberId,
            amount = 2000m,
            currency = "GHS",
            dateSent = "2026-08-05T00:00:00Z",
            attachmentKey = "giving/test/pfcc-receipt.jpg",
            notes = "PFCC Rhapsody Tuesday",
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var contribution = await create.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PendingApproval", contribution.GetProperty("status").GetString());
        Assert.Equal("PFCCManager", contribution.GetProperty("enteredByRole").GetString());
        Assert.Equal("Pastor", contribution.GetProperty("pendingApproverRole").GetString());
        var contributionId = contribution.GetProperty("id").GetGuid();

        var fellowshipLeader = await db.ChurchMembers.SingleAsync(m => m.Email == "jane.fellowship@example.com");
        var fellowshipClient = ClientForAuthUser(
            fellowshipLeader.AuthUserId!.Value,
            "jane.fellowship@example.com",
            "Jane Fellowship");
        var fellowshipBlocked = await fellowshipClient.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.Forbidden, fellowshipBlocked.StatusCode);

        var approve = await pastor.PostAsync(
            $"/api/giving/programs/{programId}/contributions/{contributionId}/approve",
            null);
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var rollup = await pastor.GetFromJsonAsync<JsonElement>($"/api/giving/programs/{programId}/rollup");
        Assert.Equal(2000m, rollup.GetProperty("totalApprovedAmount").GetDecimal());
    }

    [Fact]
    public async Task Authenticated_leader_can_upload_giving_attachment()
    {
        var pastor = PastorClient();
        await pastor.PostAsJsonAsync("/api/onboarding", new { churchName = "Upload Church" });

        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xD9]), "file", "receipt.jpg");

        var upload = await pastor.PostAsync("/api/giving/attachments", form);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);

        var body = await upload.Content.ReadFromJsonAsync<JsonElement>();
        var key = body.GetProperty("attachmentKey").GetString();
        Assert.StartsWith("giving/", key);
        Assert.EndsWith(".jpg", key);
        Assert.StartsWith("https://fake.test/", body.GetProperty("url").GetString());

        await pastor.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[]
            {
                new { standardType = "Fellowship", displayName = "Fellowship" },
                new { standardType = "Cell", displayName = "Cell" },
            },
        });

        var fellowshipResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = (await GetLayerIdAsync(pastor, "Fellowship")),
            name = "F1",
        });
        var fellowshipId = (await fellowshipResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var cellResp = await pastor.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId = (await GetLayerIdAsync(pastor, "Cell")),
            parentNodeId = fellowshipId,
            name = "Cell A",
        });
        var cellId = (await cellResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("node").GetProperty("id").GetGuid();

        var memberId = (await (await pastor.PostAsJsonAsync("/api/structure/members", new
        {
            name = "Upload Member",
            parentNodeId = cellId,
            email = "upload.member@example.com",
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var programResp = await pastor.PostAsJsonAsync("/api/giving/programs", new
        {
            givingType = "Rhapsody",
            title = "Upload Test",
            periodLabel = "2026",
            scopeKind = "ChurchWide",
        });
        var programId = (await programResp.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var create = await pastor.PostAsJsonAsync($"/api/giving/programs/{programId}/contributions", new
        {
            memberId,
            amount = 25m,
            currency = "GHS",
            dateSent = "2026-08-01T00:00:00Z",
            attachmentKey = key,
        });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var download = await pastor.GetAsync($"/api/giving/attachments/content?key={Uri.EscapeDataString(key!)}");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/jpeg", download.Content.Headers.ContentType?.MediaType);
    }

    private static async Task<Guid> GetLayerIdAsync(HttpClient client, string standardType)
    {
        var tree = await client.GetFromJsonAsync<JsonElement>("/api/structure/tree");
        foreach (var layer in tree.GetProperty("layers").EnumerateArray())
        {
            if (layer.GetProperty("standardType").GetString() == standardType)
                return layer.GetProperty("id").GetGuid();
        }

        throw new InvalidOperationException($"Layer {standardType} not found");
    }
}
