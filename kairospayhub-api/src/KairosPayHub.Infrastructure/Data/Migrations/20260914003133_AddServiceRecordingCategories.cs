using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceRecordingCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "church_service_recordings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "service_recording_categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_recording_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_service_recording_categories_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_service_recordings_CategoryId",
                table: "church_service_recordings",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_service_recording_categories_ChurchId",
                table: "service_recording_categories",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_service_recording_categories_ChurchId_Name",
                table: "service_recording_categories",
                columns: new[] { "ChurchId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_church_service_recordings_service_recording_categories_Cate~",
                table: "church_service_recordings",
                column: "CategoryId",
                principalTable: "service_recording_categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_church_service_recordings_service_recording_categories_Cate~",
                table: "church_service_recordings");

            migrationBuilder.DropTable(
                name: "service_recording_categories");

            migrationBuilder.DropIndex(
                name: "IX_church_service_recordings_CategoryId",
                table: "church_service_recordings");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "church_service_recordings");
        }
    }
}
