using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChurchCalendarEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "church_calendar_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScopeNodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    EventDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_church_calendar_events", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_calendar_events_ChurchId_EventDate",
                table: "church_calendar_events",
                columns: new[] { "ChurchId", "EventDate" });

            migrationBuilder.CreateIndex(
                name: "IX_church_calendar_events_ScopeNodeId",
                table: "church_calendar_events",
                column: "ScopeNodeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "church_calendar_events");
        }
    }
}
