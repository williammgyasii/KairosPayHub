using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContributionRemittanceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BatchId",
                table: "contributions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RemittanceMedium",
                table: "contributions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RemittanceMediumOther",
                table: "contributions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SentToPastor",
                table: "contributions",
                type: "boolean",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BatchId",
                table: "contributions");

            migrationBuilder.DropColumn(
                name: "RemittanceMedium",
                table: "contributions");

            migrationBuilder.DropColumn(
                name: "RemittanceMediumOther",
                table: "contributions");

            migrationBuilder.DropColumn(
                name: "SentToPastor",
                table: "contributions");
        }
    }
}
