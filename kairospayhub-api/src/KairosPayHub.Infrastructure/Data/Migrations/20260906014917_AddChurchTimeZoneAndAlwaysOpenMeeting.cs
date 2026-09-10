using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChurchTimeZoneAndAlwaysOpenMeeting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "church_tenants",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "UTC");

            migrationBuilder.Sql("""
                UPDATE church_tenants SET "TimeZoneId" = CASE UPPER(COALESCE("CountryCode", ''))
                    WHEN 'GH' THEN 'Africa/Accra'
                    WHEN 'US' THEN 'America/New_York'
                    WHEN 'CA' THEN 'America/Toronto'
                    WHEN 'GB' THEN 'Europe/London'
                    WHEN 'NG' THEN 'Africa/Lagos'
                    WHEN 'KE' THEN 'Africa/Nairobi'
                    WHEN 'ZA' THEN 'Africa/Johannesburg'
                    WHEN 'AU' THEN 'Australia/Sydney'
                    WHEN 'JM' THEN 'America/Jamaica'
                    WHEN 'LR' THEN 'Africa/Monrovia'
                    WHEN 'SL' THEN 'Africa/Freetown'
                    WHEN 'CI' THEN 'Africa/Abidjan'
                    WHEN 'SN' THEN 'Africa/Dakar'
                    WHEN 'DE' THEN 'Europe/Berlin'
                    WHEN 'FR' THEN 'Europe/Paris'
                    WHEN 'NL' THEN 'Europe/Amsterdam'
                    ELSE 'UTC'
                END;
                """);

            migrationBuilder.AddColumn<bool>(
                name: "IsAlwaysOpen",
                table: "attendance_meeting_types",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "church_tenants");

            migrationBuilder.DropColumn(
                name: "IsAlwaysOpen",
                table: "attendance_meeting_types");
        }
    }
}
