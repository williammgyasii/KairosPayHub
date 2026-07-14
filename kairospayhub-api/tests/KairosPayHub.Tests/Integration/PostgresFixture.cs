using KairosPayHub.Api.Data;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace KairosPayHub.Tests.Integration;

/// <summary>
/// Spins up a throwaway Postgres container once for the whole test collection,
/// applies EF migrations, and hands out fresh DbContexts. Call ResetAsync
/// between tests to truncate all tables.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container =
        new PostgreSqlBuilder("postgres:16-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        await using var db = CreateContext();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _container.DisposeAsync();

    public KairosDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<KairosDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
        return new KairosDbContext(options);
    }

    public async Task ResetAsync()
    {
        await using var db = CreateContext();
        await db.Database.ExecuteSqlRawAsync(
            "TRUNCATE records, users, churches, organizations RESTART IDENTITY CASCADE;");
    }
}

[CollectionDefinition("postgres")]
public class PostgresCollection : ICollectionFixture<PostgresFixture>;
