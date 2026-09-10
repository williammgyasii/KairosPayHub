using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNestedGivingPrograms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_giving_programs_ChurchId_GivingType_PeriodLabel_ScopeKind",
                table: "giving_programs");

            migrationBuilder.AddColumn<Guid>(
                name: "ParentProgramId",
                table: "giving_programs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "giving_programs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_GivingType_PeriodLabel_ScopeKind",
                table: "giving_programs",
                columns: new[] { "ChurchId", "GivingType", "PeriodLabel", "ScopeKind" },
                unique: true,
                filter: "\"ScopeKind\" = 'ChurchWide' AND \"ParentProgramId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ParentProgramId",
                table: "giving_programs",
                column: "ParentProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_giving_programs_giving_programs_ParentProgramId",
                table: "giving_programs",
                column: "ParentProgramId",
                principalTable: "giving_programs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_giving_programs_giving_programs_ParentProgramId",
                table: "giving_programs");

            migrationBuilder.DropIndex(
                name: "IX_giving_programs_ChurchId_GivingType_PeriodLabel_ScopeKind",
                table: "giving_programs");

            migrationBuilder.DropIndex(
                name: "IX_giving_programs_ParentProgramId",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "ParentProgramId",
                table: "giving_programs");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "giving_programs");

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_GivingType_PeriodLabel_ScopeKind",
                table: "giving_programs",
                columns: new[] { "ChurchId", "GivingType", "PeriodLabel", "ScopeKind" },
                unique: true,
                filter: "\"ScopeKind\" = 'ChurchWide'");
        }
    }
}
