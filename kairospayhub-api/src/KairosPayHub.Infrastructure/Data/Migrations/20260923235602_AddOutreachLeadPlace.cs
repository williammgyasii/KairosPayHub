using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOutreachLeadPlace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "outreach_churches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "RadiusMiles",
                table: "outreach_churches",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "outreach_churches",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "outreach_churches");

            migrationBuilder.DropColumn(
                name: "RadiusMiles",
                table: "outreach_churches");

            migrationBuilder.DropColumn(
                name: "State",
                table: "outreach_churches");
        }
    }
}
