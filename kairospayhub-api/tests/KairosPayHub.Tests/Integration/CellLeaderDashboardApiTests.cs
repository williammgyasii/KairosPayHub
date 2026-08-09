using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class CellLeaderDashboardApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Cell_leader_can_load_scoped_dashboard()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);

        var resp = await seed.CellClient.GetAsync("/api/giving/dashboard");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var dashboard = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Cell A", dashboard.GetProperty("scopeUnitName").GetString());
        Assert.True(dashboard.GetProperty("memberCount").GetInt32() >= 1);
        Assert.Equal(0, dashboard.GetProperty("pendingApprovalCount").GetInt32());
    }

    [Fact]
    public async Task Cell_leader_can_list_members_in_their_cell()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);

        var resp = await seed.CellClient.GetAsync("/api/structure/members?page=1&pageSize=25");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("totalCount").GetInt32() >= 1);
    }
}
