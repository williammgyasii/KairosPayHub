using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOutreachLeadStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "outreach_churches",
                type: "text",
                nullable: false,
                defaultValue: "Scouted");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "outreach_churches");
        }
    }
}
