using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ServiceTests(PostgresFixture fx) : IAsyncLifetime
{
    public Task InitializeAsync() => fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Actor ActorFor(User u) => new(u.Id, u.OrganizationId, u.Role, u.ChurchId);

    private async Task SeedAsync(params object[] entities)
    {
        await using var db = fx.CreateContext();
        db.AddRange(entities);
        await db.SaveChangesAsync();
    }

    private ChurchService NewChurchService()
    {
        var db = fx.CreateContext();
        return new ChurchService(db);
    }

    [Fact]
    public async Task Pastor_creates_church_leader_cannot()
    {
        var org = Seed.Org();
        var pastor = Seed.User(org, Role.Pastor);
        var leaderNoChurch = Seed.User(org, Role.Leader);
        await SeedAsync(org, pastor, leaderNoChurch);

        var churches = NewChurchService();
        await churches.CreateAsync(ActorFor(pastor), "New Avenue");
        var list = await churches.ListAsync(ActorFor(pastor));
        Assert.Single(list);
        Assert.Equal("New Avenue", list[0].Name);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => churches.CreateAsync(ActorFor(leaderNoChurch), "Nope"));
    }
}
