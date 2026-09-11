using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KairosPayHub.Api.Data;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    [DbContext(typeof(KairosDbContext))]
    [Migration("20260911194000_AddUserTablePreferences")]
    public partial class AddUserTablePreferences : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_table_preferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ColumnsJson = table.Column<string>(type: "jsonb", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_table_preferences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_table_preferences_AuthUserId",
                table: "user_table_preferences",
                column: "AuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_user_table_preferences_AuthUserId_Key",
                table: "user_table_preferences",
                columns: new[] { "AuthUserId", "Key" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "user_table_preferences");
        }
    }
}
