using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceSubmissionLayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SubmissionLayerId",
                table: "attendance_meeting_types",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_types_SubmissionLayerId",
                table: "attendance_meeting_types",
                column: "SubmissionLayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_attendance_meeting_types_structure_layers_SubmissionLayerId",
                table: "attendance_meeting_types",
                column: "SubmissionLayerId",
                principalTable: "structure_layers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Prefer Cell layer; else deepest (highest SortOrder) template layer per church.
            migrationBuilder.Sql("""
                UPDATE attendance_meeting_types AS mt
                SET "SubmissionLayerId" = COALESCE(
                    (
                        SELECT l."Id"
                        FROM structure_layers AS l
                        INNER JOIN structure_templates AS t ON l."TemplateId" = t."Id"
                        WHERE t."ChurchId" = mt."ChurchId" AND l."StandardType" = 'Cell'
                        ORDER BY l."SortOrder"
                        LIMIT 1
                    ),
                    (
                        SELECT l."Id"
                        FROM structure_layers AS l
                        INNER JOIN structure_templates AS t ON l."TemplateId" = t."Id"
                        WHERE t."ChurchId" = mt."ChurchId"
                        ORDER BY l."SortOrder" DESC
                        LIMIT 1
                    )
                )
                WHERE mt."SubmissionLayerId" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_attendance_meeting_types_structure_layers_SubmissionLayerId",
                table: "attendance_meeting_types");

            migrationBuilder.DropIndex(
                name: "IX_attendance_meeting_types_SubmissionLayerId",
                table: "attendance_meeting_types");

            migrationBuilder.DropColumn(
                name: "SubmissionLayerId",
                table: "attendance_meeting_types");
        }
    }
}
