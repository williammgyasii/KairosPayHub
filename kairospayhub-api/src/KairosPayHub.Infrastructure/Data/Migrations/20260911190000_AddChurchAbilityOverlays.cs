using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KairosPayHub.Api.Data;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    [DbContext(typeof(KairosDbContext))]
    [Migration("20260911190000_AddChurchAbilityOverlays")]
    public partial class AddChurchAbilityOverlays : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "church_ability_overlays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectKind = table.Column<string>(type: "text", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    Ability = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_church_ability_overlays", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_ability_overlays_ChurchId",
                table: "church_ability_overlays",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_church_ability_overlays_ChurchId_SubjectKind_SubjectId_Ability",
                table: "church_ability_overlays",
                columns: new[] { "ChurchId", "SubjectKind", "SubjectId", "Ability" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "church_ability_overlays");
        }
    }
}
