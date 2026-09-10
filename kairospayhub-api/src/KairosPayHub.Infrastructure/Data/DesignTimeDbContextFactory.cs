using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace KairosPayHub.Api.Data;

/// <summary>
/// Used only by `dotnet ef` at design time to build the model for migrations.
/// No live database is contacted; the connection string just needs to name the
/// Npgsql provider so SQL can be generated.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<KairosDbContext>
{
    public KairosDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<KairosDbContext>()
            .UseNpgsql("Host=localhost;Database=kairospayhub;Username=postgres;Password=postgres")
            .Options;
        return new KairosDbContext(options);
    }
}
