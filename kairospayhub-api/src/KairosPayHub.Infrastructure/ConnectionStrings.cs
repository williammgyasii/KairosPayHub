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
            ApplyRenderSettings(csb);
            return csb.ConnectionString;
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        ApplyRenderSettings(builder);
        return builder.ConnectionString;
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

    private static void ApplyRenderSettings(NpgsqlConnectionStringBuilder csb)
    {
        csb.GssEncryptionMode = GssEncryptionMode.Disable;

        if (csb.Host is not { } host)
            return;

        var isRenderInternal = host.StartsWith("dpg-", StringComparison.OrdinalIgnoreCase) && !host.Contains('.');
        if (isRenderInternal)
        {
            // Same-region private network (API + DB on Render).
            csb.SslMode = SslMode.Disable;
            return;
        }

        if (host.Contains("-postgres.render.com", StringComparison.OrdinalIgnoreCase))
            csb.SslMode = SslMode.Require;
    }
}
