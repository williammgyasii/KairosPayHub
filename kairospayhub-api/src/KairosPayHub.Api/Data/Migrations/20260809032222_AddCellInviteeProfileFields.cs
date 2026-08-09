using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCellInviteeProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OccupationStatus",
                table: "attendance_cell_invitees",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PriorChurchAttendance",
                table: "attendance_cell_invitees",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Residence",
                table: "attendance_cell_invitees",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SchoolOrWorkplace",
                table: "attendance_cell_invitees",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OccupationStatus",
                table: "attendance_cell_invitees");

            migrationBuilder.DropColumn(
                name: "PriorChurchAttendance",
                table: "attendance_cell_invitees");

            migrationBuilder.DropColumn(
                name: "Residence",
                table: "attendance_cell_invitees");

            migrationBuilder.DropColumn(
                name: "SchoolOrWorkplace",
                table: "attendance_cell_invitees");
        }
    }
}
