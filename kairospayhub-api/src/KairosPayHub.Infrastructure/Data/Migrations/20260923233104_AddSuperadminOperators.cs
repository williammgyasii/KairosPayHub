using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSuperadminOperators : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "superadmin_operators",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_superadmin_operators", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_superadmin_operators_Email",
                table: "superadmin_operators",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "superadmin_operators");
        }
    }
}
