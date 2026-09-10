using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGivingPrograms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "giving_programs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    GivingType = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PeriodLabel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ScopeKind = table.Column<string>(type: "text", nullable: false),
                    ScopeNodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giving_programs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_giving_programs_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId",
                table: "giving_programs",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_GivingType_PeriodLabel_ScopeKind",
                table: "giving_programs",
                columns: new[] { "ChurchId", "GivingType", "PeriodLabel", "ScopeKind" },
                unique: true,
                filter: "\"ScopeKind\" = 'ChurchWide'");

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_Status",
                table: "giving_programs",
                columns: new[] { "ChurchId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "giving_programs");
        }
    }
}
