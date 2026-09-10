using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberExtendedProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DateOfBirth",
                table: "church_members",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OccupationStatus",
                table: "church_members",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Residence",
                table: "church_members",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SchoolOrWorkplace",
                table: "church_members",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "church_members");

            migrationBuilder.DropColumn(
                name: "OccupationStatus",
                table: "church_members");

            migrationBuilder.DropColumn(
                name: "Residence",
                table: "church_members");

            migrationBuilder.DropColumn(
                name: "SchoolOrWorkplace",
                table: "church_members");
        }
    }
}
