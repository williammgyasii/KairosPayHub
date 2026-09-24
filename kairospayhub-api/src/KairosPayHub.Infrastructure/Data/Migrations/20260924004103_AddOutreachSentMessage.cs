using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOutreachSentMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SentBody",
                table: "outreach_churches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SentSubject",
                table: "outreach_churches",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SentBody",
                table: "outreach_churches");

            migrationBuilder.DropColumn(
                name: "SentSubject",
                table: "outreach_churches");
        }
    }
}
