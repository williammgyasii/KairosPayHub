using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChurchStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "church_tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_church_tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pfccs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pfccs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pfccs_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "structure_fellowships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    PfccId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_structure_fellowships", x => x.Id);
                    table.UniqueConstraint("AK_structure_fellowships_ChurchId_Id", x => new { x.ChurchId, x.Id });
                    table.ForeignKey(
                        name: "FK_structure_fellowships_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_structure_fellowships_pfccs_PfccId",
                        column: x => x.PfccId,
                        principalTable: "pfccs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "structure_cells",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    FellowshipId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_structure_cells", x => x.Id);
                    table.UniqueConstraint("AK_structure_cells_ChurchId_Id", x => new { x.ChurchId, x.Id });
                    table.ForeignKey(
                        name: "FK_structure_cells_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_structure_cells_structure_fellowships_ChurchId_FellowshipId",
                        columns: x => new { x.ChurchId, x.FellowshipId },
                        principalTable: "structure_fellowships",
                        principalColumns: new[] { "ChurchId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "church_members",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CellId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_church_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_church_members_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_church_members_structure_cells_ChurchId_CellId",
                        columns: x => new { x.ChurchId, x.CellId },
                        principalTable: "structure_cells",
                        principalColumns: new[] { "ChurchId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "role_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    ScopePfccId = table.Column<Guid>(type: "uuid", nullable: true),
                    ScopeFellowshipId = table.Column<Guid>(type: "uuid", nullable: true),
                    ScopeCellId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_role_assignments_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_role_assignments_pfccs_ScopePfccId",
                        column: x => x.ScopePfccId,
                        principalTable: "pfccs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_role_assignments_structure_cells_ScopeCellId",
                        column: x => x.ScopeCellId,
                        principalTable: "structure_cells",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_role_assignments_structure_fellowships_ScopeFellowshipId",
                        column: x => x.ScopeFellowshipId,
                        principalTable: "structure_fellowships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_church_members_CellId",
                table: "church_members",
                column: "CellId");

            migrationBuilder.CreateIndex(
                name: "IX_church_members_ChurchId",
                table: "church_members",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_church_members_ChurchId_CellId",
                table: "church_members",
                columns: new[] { "ChurchId", "CellId" });

            migrationBuilder.CreateIndex(
                name: "IX_pfccs_ChurchId",
                table: "pfccs",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_AuthUserId",
                table: "role_assignments",
                column: "AuthUserId");

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ChurchId",
                table: "role_assignments",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ScopeCellId",
                table: "role_assignments",
                column: "ScopeCellId");

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ScopeFellowshipId",
                table: "role_assignments",
                column: "ScopeFellowshipId");

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ScopePfccId",
                table: "role_assignments",
                column: "ScopePfccId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_cells_ChurchId_FellowshipId",
                table: "structure_cells",
                columns: new[] { "ChurchId", "FellowshipId" });

            migrationBuilder.CreateIndex(
                name: "IX_structure_cells_FellowshipId",
                table: "structure_cells",
                column: "FellowshipId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_fellowships_ChurchId",
                table: "structure_fellowships",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_fellowships_PfccId",
                table: "structure_fellowships",
                column: "PfccId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "church_members");

            migrationBuilder.DropTable(
                name: "role_assignments");

            migrationBuilder.DropTable(
                name: "structure_cells");

            migrationBuilder.DropTable(
                name: "structure_fellowships");

            migrationBuilder.DropTable(
                name: "pfccs");

            migrationBuilder.DropTable(
                name: "church_tenants");
        }
    }
}
