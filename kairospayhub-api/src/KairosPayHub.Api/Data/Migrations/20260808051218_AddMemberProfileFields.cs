using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "church_members",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Position",
                table: "church_members",
                type: "text",
                nullable: false,
                defaultValue: "Member");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Age",
                table: "church_members");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "church_members");
        }
    }
}
