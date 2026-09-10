using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChurchOnboardingProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ApproximateMemberCount",
                table: "church_tenants",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "church_tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryPastorName",
                table: "church_tenants",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApproximateMemberCount",
                table: "church_tenants");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "church_tenants");

            migrationBuilder.DropColumn(
                name: "PrimaryPastorName",
                table: "church_tenants");
        }
    }
}
