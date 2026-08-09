using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attendance_meeting_types",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RecurrenceKind = table.Column<string>(type: "text", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    ScopeKind = table.Column<string>(type: "text", nullable: false),
                    ScopeNodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    OpensDayOffset = table.Column<int>(type: "integer", nullable: false),
                    OpensTimeUtc = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    DeadlineDayOffset = table.Column<int>(type: "integer", nullable: false),
                    DeadlineTimeUtc = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    AutoGenerateWeeksAhead = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_meeting_types", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_meeting_types_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "attendance_meeting_type_scope_nodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    StructureNodeId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_meeting_type_scope_nodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_meeting_type_scope_nodes_attendance_meeting_type~",
                        column: x => x.MeetingTypeId,
                        principalTable: "attendance_meeting_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "attendance_occurrences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeetingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SubmissionOpensAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SubmissionDeadlineAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ExcusedReason = table.Column<string>(type: "text", nullable: true),
                    ExcusedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExcusedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_occurrences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_occurrences_attendance_meeting_types_MeetingType~",
                        column: x => x.MeetingTypeId,
                        principalTable: "attendance_meeting_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "attendance_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurrenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    MemberScopeNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    MarkedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    MarkedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AutoMarkedAbsentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_entries_attendance_occurrences_OccurrenceId",
                        column: x => x.OccurrenceId,
                        principalTable: "attendance_occurrences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendance_entries_church_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "church_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "attendance_scope_submissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurrenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScopeNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedLeaderAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EnteredByRole = table.Column<string>(type: "text", nullable: true),
                    ApprovalStatus = table.Column<string>(type: "text", nullable: false),
                    LockStatus = table.Column<string>(type: "text", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SubmittedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RejectedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    GraceDeadlineAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReopenedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReopenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_scope_submissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_scope_submissions_attendance_occurrences_Occurre~",
                        column: x => x.OccurrenceId,
                        principalTable: "attendance_occurrences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_entries_MemberId",
                table: "attendance_entries",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_entries_OccurrenceId",
                table: "attendance_entries",
                column: "OccurrenceId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_entries_OccurrenceId_MemberId",
                table: "attendance_entries",
                columns: new[] { "OccurrenceId", "MemberId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_type_scope_nodes_MeetingTypeId",
                table: "attendance_meeting_type_scope_nodes",
                column: "MeetingTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_type_scope_nodes_MeetingTypeId_Structure~",
                table: "attendance_meeting_type_scope_nodes",
                columns: new[] { "MeetingTypeId", "StructureNodeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_types_ChurchId",
                table: "attendance_meeting_types",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_occurrences_ChurchId",
                table: "attendance_occurrences",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_occurrences_MeetingTypeId",
                table: "attendance_occurrences",
                column: "MeetingTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_occurrences_MeetingTypeId_MeetingDate",
                table: "attendance_occurrences",
                columns: new[] { "MeetingTypeId", "MeetingDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_scope_submissions_OccurrenceId",
                table: "attendance_scope_submissions",
                column: "OccurrenceId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_scope_submissions_OccurrenceId_ScopeNodeId",
                table: "attendance_scope_submissions",
                columns: new[] { "OccurrenceId", "ScopeNodeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_entries");

            migrationBuilder.DropTable(
                name: "attendance_meeting_type_scope_nodes");

            migrationBuilder.DropTable(
                name: "attendance_scope_submissions");

            migrationBuilder.DropTable(
                name: "attendance_occurrences");

            migrationBuilder.DropTable(
                name: "attendance_meeting_types");
        }
    }
}
