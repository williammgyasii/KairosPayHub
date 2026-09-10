using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens");

            migrationBuilder.CreateIndex(
                name: "IX_structure_nodes_ChurchId_LayerId",
                table: "structure_nodes",
                columns: new[] { "ChurchId", "LayerId" });

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ChurchId_AuthUserId",
                table: "role_assignments",
                columns: new[] { "ChurchId", "AuthUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ChurchId_Role",
                table: "role_assignments",
                columns: new[] { "ChurchId", "Role" });

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ChurchId_ScopeNodeId",
                table: "role_assignments",
                columns: new[] { "ChurchId", "ScopeNodeId" });

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens",
                column: "TokenHash",
                filter: "\"Revoked\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_UserId_Revoked",
                table: "refresh_tokens",
                columns: new[] { "UserId", "Revoked" });

            migrationBuilder.CreateIndex(
                name: "IX_records_ChurchId_Status",
                table: "records",
                columns: new[] { "ChurchId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_records_OrganizationId_ChurchId",
                table: "records",
                columns: new[] { "OrganizationId", "ChurchId" });

            migrationBuilder.CreateIndex(
                name: "IX_records_OrganizationId_DateSent",
                table: "records",
                columns: new[] { "OrganizationId", "DateSent" });

            migrationBuilder.CreateIndex(
                name: "IX_one_time_tokens_TokenHash_Purpose",
                table: "one_time_tokens",
                columns: new[] { "TokenHash", "Purpose" });

            migrationBuilder.CreateIndex(
                name: "IX_one_time_tokens_UserId",
                table: "one_time_tokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_email_confirmation_codes_UserId_Code",
                table: "email_confirmation_codes",
                columns: new[] { "UserId", "Code" });

            migrationBuilder.CreateIndex(
                name: "IX_church_members_AuthUserId",
                table: "church_members",
                column: "AuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_church_members_ChurchId_Email",
                table: "church_members",
                columns: new[] { "ChurchId", "Email" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_structure_nodes_ChurchId_LayerId",
                table: "structure_nodes");

            migrationBuilder.DropIndex(
                name: "IX_role_assignments_ChurchId_AuthUserId",
                table: "role_assignments");

            migrationBuilder.DropIndex(
                name: "IX_role_assignments_ChurchId_Role",
                table: "role_assignments");

            migrationBuilder.DropIndex(
                name: "IX_role_assignments_ChurchId_ScopeNodeId",
                table: "role_assignments");

            migrationBuilder.DropIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens");

            migrationBuilder.DropIndex(
                name: "IX_refresh_tokens_UserId_Revoked",
                table: "refresh_tokens");

            migrationBuilder.DropIndex(
                name: "IX_records_ChurchId_Status",
                table: "records");

            migrationBuilder.DropIndex(
                name: "IX_records_OrganizationId_ChurchId",
                table: "records");

            migrationBuilder.DropIndex(
                name: "IX_records_OrganizationId_DateSent",
                table: "records");

            migrationBuilder.DropIndex(
                name: "IX_one_time_tokens_TokenHash_Purpose",
                table: "one_time_tokens");

            migrationBuilder.DropIndex(
                name: "IX_one_time_tokens_UserId",
                table: "one_time_tokens");

            migrationBuilder.DropIndex(
                name: "IX_email_confirmation_codes_UserId_Code",
                table: "email_confirmation_codes");

            migrationBuilder.DropIndex(
                name: "IX_church_members_AuthUserId",
                table: "church_members");

            migrationBuilder.DropIndex(
                name: "IX_church_members_ChurchId_Email",
                table: "church_members");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens",
                column: "TokenHash");
        }
    }
}
