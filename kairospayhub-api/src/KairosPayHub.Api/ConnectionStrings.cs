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
}
