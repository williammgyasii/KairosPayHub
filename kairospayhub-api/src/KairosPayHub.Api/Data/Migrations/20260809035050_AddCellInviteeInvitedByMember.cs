using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCellInviteeInvitedByMember : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "InvitedByMemberId",
                table: "attendance_cell_invitees",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_cell_invitees_InvitedByMemberId",
                table: "attendance_cell_invitees",
                column: "InvitedByMemberId");

            migrationBuilder.AddForeignKey(
                name: "FK_attendance_cell_invitees_church_members_InvitedByMemberId",
                table: "attendance_cell_invitees",
                column: "InvitedByMemberId",
                principalTable: "church_members",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_attendance_cell_invitees_church_members_InvitedByMemberId",
                table: "attendance_cell_invitees");

            migrationBuilder.DropIndex(
                name: "IX_attendance_cell_invitees_InvitedByMemberId",
                table: "attendance_cell_invitees");

            migrationBuilder.DropColumn(
                name: "InvitedByMemberId",
                table: "attendance_cell_invitees");
        }
    }
}
