using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignSchedulingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomTypeLabel",
                table: "giving_programs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EndsOn",
                table: "giving_programs",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EventDate",
                table: "giving_programs",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "GoLiveAt",
                table: "giving_programs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LeadersNotifiedAt",
                table: "giving_programs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LogOpensAt",
                table: "giving_programs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "StartsOn",
                table: "giving_programs",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomTypeLabel",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "EndsOn",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "EventDate",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "GoLiveAt",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "LeadersNotifiedAt",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "LogOpensAt",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "StartsOn",
                table: "giving_programs");
        }
    }
}
