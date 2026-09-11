using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KairosPayHub.Api.Data;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    [DbContext(typeof(KairosDbContext))]
    [Migration("20260911210000_AddGuestRiskOnScopeSubmissions")]
    public partial class AddGuestRiskOnScopeSubmissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuestRiskLevel",
                table: "attendance_scope_submissions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "clear");

            migrationBuilder.AddColumn<string>(
                name: "GuestRiskReasons",
                table: "attendance_scope_submissions",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");

            migrationBuilder.Sql("""
                UPDATE attendance_scope_submissions
                SET "GuestRiskLevel" = 'clear',
                    "GuestRiskReasons" = '[]'::jsonb
                WHERE "GuestRiskLevel" IS NULL
                   OR "GuestRiskReasons" IS NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuestRiskLevel",
                table: "attendance_scope_submissions");

            migrationBuilder.DropColumn(
                name: "GuestRiskReasons",
                table: "attendance_scope_submissions");
        }
    }
}
