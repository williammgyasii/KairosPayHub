using KairosPayHub.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    [DbContext(typeof(KairosDbContext))]
    [Migration("20260910204500_AddReceiveGivingsOnMain")]
    public partial class AddReceiveGivingsOnMain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ReceiveGivingsOnMain",
                table: "giving_programs",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReceiveGivingsOnMain",
                table: "giving_programs");
        }
    }
}
