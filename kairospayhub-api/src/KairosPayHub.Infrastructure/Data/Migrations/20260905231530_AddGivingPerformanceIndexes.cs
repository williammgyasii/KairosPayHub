using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGivingPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus_text",
                table: "giving_programs",
                type: "text",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE giving_programs
                SET "ApprovalStatus_text" = CASE "ApprovalStatus"
                    WHEN 0 THEN 'Approved'
                    WHEN 1 THEN 'PendingPastorApproval'
                    WHEN 2 THEN 'Rejected'
                    ELSE 'Approved'
                END
                """);

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "giving_programs");

            migrationBuilder.RenameColumn(
                name: "ApprovalStatus_text",
                table: "giving_programs",
                newName: "ApprovalStatus");

            migrationBuilder.AlterColumn<string>(
                name: "ApprovalStatus",
                table: "giving_programs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_ApprovalStatus",
                table: "giving_programs",
                columns: new[] { "ChurchId", "ApprovalStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_ParentProgramId",
                table: "giving_programs",
                columns: new[] { "ChurchId", "ParentProgramId" });

            migrationBuilder.CreateIndex(
                name: "IX_giving_programs_ChurchId_Status_GoLiveAt",
                table: "giving_programs",
                columns: new[] { "ChurchId", "Status", "GoLiveAt" });

            migrationBuilder.CreateIndex(
                name: "IX_contributions_BatchId",
                table: "contributions",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_contributions_ProgramId_BatchId",
                table: "contributions",
                columns: new[] { "ProgramId", "BatchId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_giving_programs_ChurchId_ApprovalStatus",
                table: "giving_programs");

            migrationBuilder.DropIndex(
                name: "IX_giving_programs_ChurchId_ParentProgramId",
                table: "giving_programs");

            migrationBuilder.DropIndex(
                name: "IX_giving_programs_ChurchId_Status_GoLiveAt",
                table: "giving_programs");

            migrationBuilder.DropIndex(
                name: "IX_contributions_BatchId",
                table: "contributions");

            migrationBuilder.DropIndex(
                name: "IX_contributions_ProgramId_BatchId",
                table: "contributions");

            migrationBuilder.AddColumn<int>(
                name: "ApprovalStatus_int",
                table: "giving_programs",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE giving_programs
                SET "ApprovalStatus_int" = CASE "ApprovalStatus"
                    WHEN 'Approved' THEN 0
                    WHEN 'PendingPastorApproval' THEN 1
                    WHEN 'Rejected' THEN 2
                    ELSE 0
                END
                """);

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "giving_programs");

            migrationBuilder.RenameColumn(
                name: "ApprovalStatus_int",
                table: "giving_programs",
                newName: "ApprovalStatus");

            migrationBuilder.AlterColumn<int>(
                name: "ApprovalStatus",
                table: "giving_programs",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
