using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChurchServiceRecordings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "church_service_recordings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ServiceDate = table.Column<DateOnly>(type: "date", nullable: true),
                    BunnyVideoGuid = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RetentionExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    StorageBytes = table.Column<long>(type: "bigint", nullable: true),
                    CreatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_church_service_recordings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_church_service_recordings_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_service_recordings_BunnyVideoGuid",
                table: "church_service_recordings",
                column: "BunnyVideoGuid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_church_service_recordings_ChurchId",
                table: "church_service_recordings",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_church_service_recordings_ChurchId_PublishedAt",
                table: "church_service_recordings",
                columns: new[] { "ChurchId", "PublishedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "church_service_recordings");
        }
    }
}
