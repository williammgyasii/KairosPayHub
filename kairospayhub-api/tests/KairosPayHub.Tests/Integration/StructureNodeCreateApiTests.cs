using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class StructureNodeCreateApiTests(PostgresFixture fx) : IAsyncLifetime
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

    private static async Task OnboardChurchCellAsync(HttpClient client)
    {
        var onboard = await client.PostAsJsonAsync("/api/onboarding", OnboardingTestHelper.Payload("TPH Test"));
        Assert.Equal(HttpStatusCode.OK, onboard.StatusCode);

        var template = await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        });
        Assert.Equal(HttpStatusCode.OK, template.StatusCode);
    }

    private static async Task<Guid> CellLayerIdAsync(HttpClient client)
    {
        var template = await client.GetFromJsonAsync<JsonElement>("/api/structure/template");
        return template!.GetProperty("layers")[0].GetProperty("id").GetGuid();
    }

    private static object CellLeader(string email) => new
    {
        name = "William Cell Leader",
        email,
        phone = "+14437622773",
        dateOfBirth = "1994-01-15",
        leaderIsCellLeader = true,
    };

    [Fact]
    public async Task Same_client_request_id_creates_one_unit()
    {
        var client = PastorClient();
        await OnboardChurchCellAsync(client);
        var layerId = await CellLayerIdAsync(client);
        var requestId = Guid.NewGuid();

        var payload = new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            clientRequestId = requestId,
            newLeader = CellLeader("cell-idempotent@example.com"),
        };

        var first = await client.PostAsJsonAsync("/api/structure/nodes", payload);
        var second = await client.PostAsJsonAsync("/api/structure/nodes", payload);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();
        var secondId = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("node").GetProperty("id").GetGuid();
        Assert.Equal(firstId, secondId);

        await using var db = fx.CreateContext();
        Assert.Equal(1, await db.StructureNodes.CountAsync());
    }

    [Fact]
    public async Task Duplicate_name_under_same_parent_is_rejected()
    {
        var client = PastorClient();
        await OnboardChurchCellAsync(client);
        var layerId = await CellLayerIdAsync(client);

        var first = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            clientRequestId = Guid.NewGuid(),
        });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            clientRequestId = Guid.NewGuid(),
        });
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);

        await using var db = fx.CreateContext();
        Assert.Equal(1, await db.StructureNodes.CountAsync());
    }

    [Fact]
    public async Task Failed_leader_login_does_not_leave_an_orphan_unit()
    {
        var client = PastorClient();
        await OnboardChurchCellAsync(client);
        var layerId = await CellLayerIdAsync(client);

        var first = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            clientRequestId = Guid.NewGuid(),
            newLeader = CellLeader("cell-shared@example.com"),
        });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell Two",
            clientRequestId = Guid.NewGuid(),
            newLeader = CellLeader("cell-shared@example.com"),
        });
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);

        await using var db = fx.CreateContext();
        Assert.Equal(1, await db.StructureNodes.CountAsync());
    }

    [Fact]
    public async Task Leader_email_can_be_reused_after_structure_reset()
    {
        var client = PastorClient();
        await OnboardChurchCellAsync(client);
        var layerId = await CellLayerIdAsync(client);
        const string email = "williammgyasii+cellleader@gmail.com";

        var first = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            newLeader = CellLeader(email),
        });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var reset = await client.DeleteAsync("/api/structure/template");
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        var restored = await client.PutAsJsonAsync("/api/structure/template", new
        {
            layers = new[] { new { standardType = "Cell", displayName = "Cell" } },
        });
        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
        layerId = await CellLayerIdAsync(client);

        var again = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            newLeader = CellLeader(email),
        });
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
    }

    [Fact]
    public async Task New_leader_persists_state_residence_and_occupation_fields()
    {
        var client = PastorClient();
        await OnboardChurchCellAsync(client);
        var layerId = await CellLayerIdAsync(client);

        var created = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            newLeader = new
            {
                name = "Ada Leader",
                email = "ada.leader@example.com",
                phone = "+14437622773",
                dateOfBirth = "1994-01-15",
                residence = "12 Oak St",
                state = "MD",
                occupationStatus = "StudentAndWorking",
                schoolOrWorkplace = "Howard University",
                workplace = "Kairos",
                leaderIsCellLeader = true,
            },
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        await using var db = fx.CreateContext();
        var member = await db.ChurchMembers.SingleAsync();
        Assert.Equal("12 Oak St", member.Residence);
        Assert.Equal("MD", member.State);
        Assert.Equal(KairosPayHub.Api.Domain.Structure.MemberOccupationStatus.StudentAndWorking, member.OccupationStatus);
        Assert.Equal("Howard University", member.SchoolOrWorkplace);
        Assert.Equal("Kairos", member.Workplace);
    }

    [Fact]
    public async Task New_leader_persists_unemployed_without_school_or_workplace()
    {
        var client = PastorClient();
        await OnboardChurchCellAsync(client);
        var layerId = await CellLayerIdAsync(client);

        var created = await client.PostAsJsonAsync("/api/structure/nodes", new
        {
            layerId,
            parentNodeId = (Guid?)null,
            name = "Cell One",
            newLeader = new
            {
                name = "Ada Leader",
                email = "ada.unemployed@example.com",
                phone = "+14437622773",
                dateOfBirth = "1994-01-15",
                occupationStatus = "Unemployed",
                leaderIsCellLeader = true,
            },
        });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);

        await using var db = fx.CreateContext();
        var member = await db.ChurchMembers.SingleAsync();
        Assert.Equal(KairosPayHub.Api.Domain.Structure.MemberOccupationStatus.Unemployed, member.OccupationStatus);
        Assert.Null(member.SchoolOrWorkplace);
        Assert.Null(member.Workplace);
    }
}
