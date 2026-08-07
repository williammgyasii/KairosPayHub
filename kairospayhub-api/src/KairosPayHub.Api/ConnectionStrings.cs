using Npgsql;

namespace KairosPayHub.Api;

internal static class DbConnectionString
{
    /// <summary>
    /// Render injects postgres:// URIs; local dev uses key=value. Normalize for Npgsql.
    /// </summary>
    internal static string Normalize(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return connectionString;

        // Repair a truncated Render env var (e.g. "?sslmode" with no "=require").
        if (connectionString.EndsWith("?sslmode", StringComparison.OrdinalIgnoreCase) ||
            connectionString.EndsWith("&sslmode", StringComparison.OrdinalIgnoreCase))
        {
            connectionString += "=require";
        }

        if (!connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            return connectionString;

        var csb = new NpgsqlConnectionStringBuilder
        {
            ConnectionString = connectionString,
        };

        // Render Postgres (managed dpg-* hosts) requires SSL on external strings;
        // internal network strings still accept explicit sslmode.
        if (csb.Host?.Contains("dpg-", StringComparison.OrdinalIgnoreCase) == true)
            csb.SslMode = SslMode.Require;

        return csb.ConnectionString;
    }

    /// <summary>
    /// On Render free Postgres, create the app database once by connecting to the
    /// instance default DB (same user, CREATEDB).
    /// </summary>
    internal static void EnsureDatabaseExists(string connectionString)
    {
        var target = new NpgsqlConnectionStringBuilder(connectionString);
        var dbName = target.Database;
        if (string.IsNullOrWhiteSpace(dbName))
            return;

        var admin = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Database = "lumencue",
        };

        using var conn = new NpgsqlConnection(admin.ConnectionString);
        conn.Open();

        using var exists = conn.CreateCommand();
        exists.CommandText = "SELECT 1 FROM pg_database WHERE datname = @name";
        exists.Parameters.AddWithValue("name", dbName);
        if (exists.ExecuteScalar() is not null)
            return;

        using var create = conn.CreateCommand();
        create.CommandText = $"CREATE DATABASE \"{dbName.Replace("\"", "")}\"";
        create.ExecuteNonQuery();
    }
}
