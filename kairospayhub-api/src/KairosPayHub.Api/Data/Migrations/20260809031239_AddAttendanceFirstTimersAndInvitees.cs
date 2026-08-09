using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceFirstTimersAndInvitees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attendance_cell_invitees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CellScopeNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    GraduatedMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_cell_invitees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_cell_invitees_church_members_GraduatedMemberId",
                        column: x => x.GraduatedMemberId,
                        principalTable: "church_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "attendance_first_timers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurrenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScopeNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_first_timers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_first_timers_attendance_occurrences_OccurrenceId",
                        column: x => x.OccurrenceId,
                        principalTable: "attendance_occurrences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "attendance_invitee_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurrenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScopeNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    InviteeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    WasFirstTimer = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_invitee_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_invitee_entries_attendance_cell_invitees_Invitee~",
                        column: x => x.InviteeId,
                        principalTable: "attendance_cell_invitees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_invitee_entries_attendance_occurrences_Occurrenc~",
                        column: x => x.OccurrenceId,
                        principalTable: "attendance_occurrences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_cell_invitees_ChurchId_CellScopeNodeId_IsActive",
                table: "attendance_cell_invitees",
                columns: new[] { "ChurchId", "CellScopeNodeId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_cell_invitees_GraduatedMemberId",
                table: "attendance_cell_invitees",
                column: "GraduatedMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_first_timers_OccurrenceId_ScopeNodeId",
                table: "attendance_first_timers",
                columns: new[] { "OccurrenceId", "ScopeNodeId" });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_invitee_entries_InviteeId",
                table: "attendance_invitee_entries",
                column: "InviteeId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_invitee_entries_OccurrenceId_InviteeId",
                table: "attendance_invitee_entries",
                columns: new[] { "OccurrenceId", "InviteeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_first_timers");

            migrationBuilder.DropTable(
                name: "attendance_invitee_entries");

            migrationBuilder.DropTable(
                name: "attendance_cell_invitees");
        }
    }
}
