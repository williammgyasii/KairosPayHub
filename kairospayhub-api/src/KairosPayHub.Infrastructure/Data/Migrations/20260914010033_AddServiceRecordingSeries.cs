using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceRecordingSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SeriesId",
                table: "church_service_recordings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "service_recording_series",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_recording_series", x => x.Id);
                    table.ForeignKey(
                        name: "FK_service_recording_series_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_service_recordings_SeriesId",
                table: "church_service_recordings",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_service_recording_series_ChurchId",
                table: "service_recording_series",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_service_recording_series_ChurchId_Name",
                table: "service_recording_series",
                columns: new[] { "ChurchId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_church_service_recordings_service_recording_series_SeriesId",
                table: "church_service_recordings",
                column: "SeriesId",
                principalTable: "service_recording_series",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_church_service_recordings_service_recording_series_SeriesId",
                table: "church_service_recordings");

            migrationBuilder.DropTable(
                name: "service_recording_series");

            migrationBuilder.DropIndex(
                name: "IX_church_service_recordings_SeriesId",
                table: "church_service_recordings");

            migrationBuilder.DropColumn(
                name: "SeriesId",
                table: "church_service_recordings");
        }
    }
}
