using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOutreachAreaCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "outreach_area_caches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    State = table.Column<string>(type: "text", nullable: false),
                    RadiusMiles = table.Column<double>(type: "double precision", nullable: false),
                    SearchedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outreach_area_caches", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_outreach_area_caches_City_State_RadiusMiles",
                table: "outreach_area_caches",
                columns: new[] { "City", "State", "RadiusMiles" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "outreach_area_caches");
        }
    }
}
