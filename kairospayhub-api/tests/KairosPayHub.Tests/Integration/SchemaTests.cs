using KairosPayHub.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class SchemaTests(PostgresFixture fx) : IAsyncLifetime
{
    public Task InitializeAsync() => fx.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

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
}
