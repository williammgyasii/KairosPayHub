using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStructureNodeProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LeaderMemberId",
                table: "structure_nodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UnitNumber",
                table: "structure_nodes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_structure_nodes_LeaderMemberId",
                table: "structure_nodes",
                column: "LeaderMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_structure_nodes_church_members_LeaderMemberId",
                table: "structure_nodes",
                column: "LeaderMemberId",
                principalTable: "church_members",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_structure_nodes_church_members_LeaderMemberId",
                table: "structure_nodes");

            migrationBuilder.DropIndex(
                name: "IX_structure_nodes_LeaderMemberId",
                table: "structure_nodes");

            migrationBuilder.DropColumn(
                name: "LeaderMemberId",
                table: "structure_nodes");

            migrationBuilder.DropColumn(
                name: "UnitNumber",
                table: "structure_nodes");
        }
    }
}
