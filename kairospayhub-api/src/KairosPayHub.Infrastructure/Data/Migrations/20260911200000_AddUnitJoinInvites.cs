using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KairosPayHub.Api.Data;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    [DbContext(typeof(KairosDbContext))]
    [Migration("20260911200000_AddUnitJoinInvites")]
    public partial class AddUnitJoinInvites : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RosterStatus",
                table: "church_members",
                type: "text",
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.CreateTable(
                name: "unit_join_invites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    NodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unit_join_invites", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_unit_join_invites_ChurchId",
                table: "unit_join_invites",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_unit_join_invites_NodeId",
                table: "unit_join_invites",
                column: "NodeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unit_join_invites_Token",
                table: "unit_join_invites",
                column: "Token",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "unit_join_invites");

            migrationBuilder.DropColumn(
                name: "RosterStatus",
                table: "church_members");
        }
    }
}
