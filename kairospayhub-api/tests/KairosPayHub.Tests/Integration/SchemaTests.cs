using KairosPayHub.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class SchemaTests(PostgresFixture fx) : IAsyncLifetime
{
    public Task InitializeAsync() => fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Records_are_isolated_by_organization()
    {
        var orgA = Seed.Org("Org A");
        var orgB = Seed.Org("Org B");
        var churchA = Seed.Church(orgA, "Avenue A");
        var churchB = Seed.Church(orgB, "Avenue B");
        var leaderA = Seed.User(orgA, Role.Leader, churchA);
        var leaderB = Seed.User(orgB, Role.Leader, churchB);

        await using (var db = fx.CreateContext())
        {
            db.AddRange(orgA, orgB, churchA, churchB, leaderA, leaderB);
            db.Add(Seed.Record(orgA, churchA, leaderA));
            db.Add(Seed.Record(orgB, churchB, leaderB));
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var forOrgA = await db.Records
                .Where(r => r.OrganizationId == orgA.Id)
                .ToListAsync();

            Assert.Single(forOrgA);
            Assert.Equal(churchA.Id, forOrgA[0].ChurchId);
        }
    }

    [Fact]
    public async Task Duplicate_email_is_rejected()
    {
        var org = Seed.Org();
        await using var db = fx.CreateContext();
        db.Add(org);
        db.Add(Seed.User(org, Role.Pastor, email: "dup@example.com"));
        db.Add(Seed.User(org, Role.Leader, email: "dup@example.com"));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Amount_round_trips_exactly()
    {
        var org = Seed.Org();
        var church = Seed.Church(org);
        var leader = Seed.User(org, Role.Leader, church);
        var record = Seed.Record(org, church, leader, amount: 1234.56m);

        await using (var db = fx.CreateContext())
        {
            db.AddRange(org, church, leader, record);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var reloaded = await db.Records.SingleAsync();
            Assert.Equal(1234.56m, reloaded.Amount);
        }
    }

    [Fact]
    public async Task New_record_defaults_to_submitted_manual_ghs()
    {
        var org = Seed.Org();
        var church = Seed.Church(org);
        var leader = Seed.User(org, Role.Leader, church);
        var record = Seed.Record(org, church, leader);

        await using (var db = fx.CreateContext())
        {
            db.AddRange(org, church, leader, record);
            await db.SaveChangesAsync();
        }

        await using (var db = fx.CreateContext())
        {
            var reloaded = await db.Records.SingleAsync();
            Assert.Equal(RecordStatus.Submitted, reloaded.Status);
            Assert.Equal(RecordSource.Manual, reloaded.Source);
            Assert.Equal("GHS", reloaded.Currency);
            Assert.True(reloaded.CreatedAt > DateTimeOffset.MinValue);
        }
    }
}
