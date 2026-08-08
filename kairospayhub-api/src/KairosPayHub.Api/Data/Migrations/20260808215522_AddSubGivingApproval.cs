using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSubGivingApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ApprovalStatus",
                table: "giving_programs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByRole",
                table: "giving_programs",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "giving_programs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReviewedAt",
                table: "giving_programs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedByAuthUserId",
                table: "giving_programs",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE giving_programs
                SET "CreatedByRole" = 0
                WHERE "CreatedByRole" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "CreatedByRole",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "ReviewedByAuthUserId",
                table: "giving_programs");
        }
    }
}
