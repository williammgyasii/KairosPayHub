using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceMeetingPacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attendance_meeting_packs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurrenceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    ContentFingerprint = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PublishedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_meeting_packs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_meeting_packs_attendance_occurrences_OccurrenceId",
                        column: x => x.OccurrenceId,
                        principalTable: "attendance_occurrences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "attendance_meeting_pack_files",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_meeting_pack_files", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_meeting_pack_files_attendance_meeting_packs_Pack~",
                        column: x => x.PackId,
                        principalTable: "attendance_meeting_packs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "attendance_meeting_pack_receipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SeenAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DownloadedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendance_meeting_pack_receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_attendance_meeting_pack_receipts_attendance_meeting_packs_P~",
                        column: x => x.PackId,
                        principalTable: "attendance_meeting_packs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_pack_files_PackId",
                table: "attendance_meeting_pack_files",
                column: "PackId");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_pack_receipts_PackId_AuthUserId",
                table: "attendance_meeting_pack_receipts",
                columns: new[] { "PackId", "AuthUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_attendance_meeting_packs_OccurrenceId",
                table: "attendance_meeting_packs",
                column: "OccurrenceId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_meeting_pack_files");

            migrationBuilder.DropTable(
                name: "attendance_meeting_pack_receipts");

            migrationBuilder.DropTable(
                name: "attendance_meeting_packs");
        }
    }
}
