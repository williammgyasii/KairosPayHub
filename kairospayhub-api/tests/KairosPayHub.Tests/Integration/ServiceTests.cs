using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class ServiceTests(PostgresFixture fx) : IAsyncLifetime
{
    public Task InitializeAsync() => fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private static Actor ActorFor(User u) => new(u.Id, u.OrganizationId, u.Role, u.ChurchId);

    private static SubmitRecordInput Submission(Church church) =>
        new(church.Id, 500.00m, Seed.DefaultDate, PaymentMethod.MobileMoney);

    private async Task SeedAsync(params object[] entities)
    {
        await using var db = fx.CreateContext();
        db.AddRange(entities);
        await db.SaveChangesAsync();
    }

    private (RecordService records, ChurchService churches) NewServices()
    {
        var db = fx.CreateContext();
        var churches = new ChurchService(db);
        return (new RecordService(db, churches), churches);
    }

    [Fact]
    public async Task Leader_can_submit_for_own_church()
    {
        var org = Seed.Org();
        var church = Seed.Church(org);
        var leader = Seed.User(org, Role.Leader, church);
        await SeedAsync(org, church, leader);

        var (records, _) = NewServices();
        var rec = await records.SubmitAsync(ActorFor(leader), Submission(church));

        Assert.Equal(org.Id, rec.OrganizationId);
        Assert.Equal(leader.Id, rec.SubmittedById);
        Assert.Equal(RecordStatus.Submitted, rec.Status);
        Assert.Equal(500.00m, rec.Amount);
    }

    [Fact]
    public async Task Leader_cannot_submit_for_a_different_church()
    {
        var org = Seed.Org();
        var own = Seed.Church(org, "Avenue 1");
        var other = Seed.Church(org, "Avenue 2");
        var leader = Seed.User(org, Role.Leader, own);
        await SeedAsync(org, own, other, leader);

        var (records, _) = NewServices();
        await Assert.ThrowsAsync<ForbiddenException>(
            () => records.SubmitAsync(ActorFor(leader), Submission(other)));
    }

    [Fact]
    public async Task Cannot_submit_against_a_church_in_another_org()
    {
        var orgA = Seed.Org("A");
        var orgB = Seed.Org("B");
        var churchB = Seed.Church(orgB, "B Avenue");
        var pastorA = Seed.User(orgA, Role.Pastor);
        await SeedAsync(orgA, orgB, churchB, pastorA);

        var (records, _) = NewServices();
        await Assert.ThrowsAsync<ForbiddenException>(
            () => records.SubmitAsync(ActorFor(pastorA), Submission(churchB)));
    }

    [Fact]
    public async Task Leader_lists_only_their_own_church_never_another_org()
    {
        var orgA = Seed.Org("A");
        var orgB = Seed.Org("B");
        var c1 = Seed.Church(orgA, "Avenue 1");
        var c2 = Seed.Church(orgA, "Avenue 2");
        var cB = Seed.Church(orgB, "B Avenue");
        var leader1 = Seed.User(orgA, Role.Leader, c1);
        var leader2 = Seed.User(orgA, Role.Leader, c2);
        var leaderB = Seed.User(orgB, Role.Leader, cB);
        await SeedAsync(orgA, orgB, c1, c2, cB, leader1, leader2, leaderB);

        var (records, _) = NewServices();
        await records.SubmitAsync(ActorFor(leader1), Submission(c1));
        await records.SubmitAsync(ActorFor(leader2), Submission(c2));
        await records.SubmitAsync(ActorFor(leaderB), Submission(cB));

        var seen = await records.ListAsync(ActorFor(leader1));
        Assert.Single(seen);
        Assert.Equal(c1.Id, seen[0].ChurchId);
    }

    [Fact]
    public async Task Pastor_lists_all_in_org_but_none_from_another()
    {
        var orgA = Seed.Org("A");
        var orgB = Seed.Org("B");
        var c1 = Seed.Church(orgA, "Avenue 1");
        var c2 = Seed.Church(orgA, "Avenue 2");
        var cB = Seed.Church(orgB, "B Avenue");
        var l1 = Seed.User(orgA, Role.Leader, c1);
        var l2 = Seed.User(orgA, Role.Leader, c2);
        var lB = Seed.User(orgB, Role.Leader, cB);
        var pastorA = Seed.User(orgA, Role.Pastor);
        await SeedAsync(orgA, orgB, c1, c2, cB, l1, l2, lB, pastorA);

        var (records, _) = NewServices();
        await records.SubmitAsync(ActorFor(l1), Submission(c1));
        await records.SubmitAsync(ActorFor(l2), Submission(c2));
        await records.SubmitAsync(ActorFor(lB), Submission(cB));

        var seen = await records.ListAsync(ActorFor(pastorA));
        Assert.Equal(2, seen.Count);
        Assert.All(seen, r => Assert.Equal(orgA.Id, r.OrganizationId));
    }

    [Fact]
    public async Task Pastor_verifies_leader_cannot()
    {
        var org = Seed.Org();
        var church = Seed.Church(org);
        var leader = Seed.User(org, Role.Leader, church);
        var pastor = Seed.User(org, Role.Pastor);
        await SeedAsync(org, church, leader, pastor);

        var (records, _) = NewServices();
        var rec = await records.SubmitAsync(ActorFor(leader), Submission(church));

        await Assert.ThrowsAsync<ForbiddenException>(
            () => records.VerifyAsync(ActorFor(leader), rec.Id));

        var verified = await records.VerifyAsync(ActorFor(pastor), rec.Id);
        Assert.Equal(RecordStatus.Verified, verified.Status);
        Assert.Equal(pastor.Id, verified.VerifiedById);
        Assert.NotNull(verified.VerifiedAt);
    }

    [Fact]
    public async Task Leader_deletes_own_submitted_but_not_once_verified()
    {
        var org = Seed.Org();
        var church = Seed.Church(org);
        var leader = Seed.User(org, Role.Leader, church);
        var pastor = Seed.User(org, Role.Pastor);
        await SeedAsync(org, church, leader, pastor);

        var (records, _) = NewServices();
        var rec = await records.SubmitAsync(ActorFor(leader), Submission(church));
        await records.DeleteAsync(ActorFor(leader), rec.Id);
        Assert.Empty(await records.ListAsync(ActorFor(leader)));

        var rec2 = await records.SubmitAsync(ActorFor(leader), Submission(church));
        await records.VerifyAsync(ActorFor(pastor), rec2.Id);
        await Assert.ThrowsAsync<ForbiddenException>(
            () => records.DeleteAsync(ActorFor(leader), rec2.Id));
    }

    [Fact]
    public async Task Pastor_creates_church_leader_cannot()
    {
        var org = Seed.Org();
        var pastor = Seed.User(org, Role.Pastor);
        var leaderNoChurch = Seed.User(org, Role.Leader);
        await SeedAsync(org, pastor, leaderNoChurch);

        var (_, churches) = NewServices();
        await churches.CreateAsync(ActorFor(pastor), "New Avenue");
        var list = await churches.ListAsync(ActorFor(pastor));
        Assert.Single(list);
        Assert.Equal("New Avenue", list[0].Name);

        await Assert.ThrowsAsync<ForbiddenException>(
            () => churches.CreateAsync(ActorFor(leaderNoChurch), "Nope"));
    }
}
