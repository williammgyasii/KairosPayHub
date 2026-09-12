using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceMeetingReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReportPayload",
                table: "attendance_scope_submissions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportSchema",
                table: "attendance_meeting_types",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresReport",
                table: "attendance_meeting_types",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReportPayload",
                table: "attendance_scope_submissions");

            migrationBuilder.DropColumn(
                name: "ReportSchema",
                table: "attendance_meeting_types");

            migrationBuilder.DropColumn(
                name: "RequiresReport",
                table: "attendance_meeting_types");
        }
    }
}
