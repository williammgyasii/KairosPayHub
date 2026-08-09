using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChurchAdministrators : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPrimaryPastor",
                table: "role_assignments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "church_administrators",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    AffiliationKind = table.Column<string>(type: "text", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeactivatedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    DeactivatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_church_administrators", x => x.Id);
                    table.ForeignKey(
                        name: "FK_church_administrators_church_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "church_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_church_administrators_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_administrators_AuthUserId",
                table: "church_administrators",
                column: "AuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_church_administrators_ChurchId",
                table: "church_administrators",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_church_administrators_ChurchId_AuthUserId",
                table: "church_administrators",
                columns: new[] { "ChurchId", "AuthUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_church_administrators_Email",
                table: "church_administrators",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_church_administrators_MemberId",
                table: "church_administrators",
                column: "MemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "church_administrators");

            migrationBuilder.DropColumn(
                name: "IsPrimaryPastor",
                table: "role_assignments");
        }
    }
}
