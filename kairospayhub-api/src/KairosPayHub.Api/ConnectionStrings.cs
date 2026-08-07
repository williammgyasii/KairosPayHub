using System.Text.RegularExpressions;
using Npgsql;

namespace KairosPayHub.Api;

internal static partial class DbConnectionString
{
    // postgresql://user:pass@host[:port]/database
    [GeneratedRegex(@"^postgres(?:ql)?://([^:/]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?]+)", RegexOptions.IgnoreCase)]
    private static partial Regex PostgresUriRegex();

    /// <summary>
    /// Render injects postgres:// URIs; local dev uses key=value. Normalize for Npgsql.
    /// </summary>
    internal static string Normalize(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return connectionString;

        connectionString = connectionString.Trim();

        if (connectionString.EndsWith("?sslmode", StringComparison.OrdinalIgnoreCase) ||
            connectionString.EndsWith("&sslmode", StringComparison.OrdinalIgnoreCase))
        {
            connectionString += "=require";
        }

        if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var q = connectionString.IndexOf('?', StringComparison.Ordinal);
            if (q >= 0)
                connectionString = connectionString[..q];

            var csb = ParsePostgresUri(connectionString);
            if (csb.Host?.Contains("dpg-", StringComparison.OrdinalIgnoreCase) == true)
                csb.SslMode = SslMode.Require;
            return csb.ConnectionString;
        }

        return connectionString;
    }

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

    private static NpgsqlConnectionStringBuilder ParsePostgresUri(string uri)
    {
        var match = PostgresUriRegex().Match(uri);
        if (!match.Success)
            throw new ArgumentException("Invalid PostgreSQL URI.", nameof(uri));

        var csb = new NpgsqlConnectionStringBuilder
        {
            Username = Uri.UnescapeDataString(match.Groups[1].Value),
            Password = Uri.UnescapeDataString(match.Groups[2].Value),
            Host = match.Groups[3].Value,
            Database = match.Groups[5].Value,
        };

        if (match.Groups[4].Success)
            csb.Port = int.Parse(match.Groups[4].Value);

        return csb;
    }
}
