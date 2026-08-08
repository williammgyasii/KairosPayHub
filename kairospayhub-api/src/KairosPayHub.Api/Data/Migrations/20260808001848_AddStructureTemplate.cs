using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStructureTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_church_members_structure_cells_ChurchId_CellId",
                table: "church_members");

            migrationBuilder.RenameColumn(
                name: "CellId",
                table: "church_members",
                newName: "ParentNodeId");

            migrationBuilder.RenameIndex(
                name: "IX_church_members_ChurchId_CellId",
                table: "church_members",
                newName: "IX_church_members_ChurchId_ParentNodeId");

            migrationBuilder.RenameIndex(
                name: "IX_church_members_CellId",
                table: "church_members",
                newName: "IX_church_members_ParentNodeId");

            migrationBuilder.AddColumn<Guid>(
                name: "ScopeNodeId",
                table: "role_assignments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "structure_templates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LockedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_structure_templates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_structure_templates_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "structure_layers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    StandardType = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_structure_layers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_structure_layers_structure_templates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "structure_templates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "structure_nodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    LayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentNodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_structure_nodes", x => x.Id);
                    table.UniqueConstraint("AK_structure_nodes_ChurchId_Id", x => new { x.ChurchId, x.Id });
                    table.ForeignKey(
                        name: "FK_structure_nodes_church_tenants_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "church_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_structure_nodes_structure_layers_LayerId",
                        column: x => x.LayerId,
                        principalTable: "structure_layers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_structure_nodes_structure_nodes_ChurchId_ParentNodeId",
                        columns: x => new { x.ChurchId, x.ParentNodeId },
                        principalTable: "structure_nodes",
                        principalColumns: new[] { "ChurchId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_role_assignments_ScopeNodeId",
                table: "role_assignments",
                column: "ScopeNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_layers_TemplateId_SortOrder",
                table: "structure_layers",
                columns: new[] { "TemplateId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_structure_nodes_ChurchId",
                table: "structure_nodes",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_nodes_ChurchId_ParentNodeId",
                table: "structure_nodes",
                columns: new[] { "ChurchId", "ParentNodeId" });

            migrationBuilder.CreateIndex(
                name: "IX_structure_nodes_LayerId",
                table: "structure_nodes",
                column: "LayerId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_nodes_ParentNodeId",
                table: "structure_nodes",
                column: "ParentNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_structure_templates_ChurchId",
                table: "structure_templates",
                column: "ChurchId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_church_members_structure_nodes_ChurchId_ParentNodeId",
                table: "church_members",
                columns: new[] { "ChurchId", "ParentNodeId" },
                principalTable: "structure_nodes",
                principalColumns: new[] { "ChurchId", "Id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_role_assignments_structure_nodes_ScopeNodeId",
                table: "role_assignments",
                column: "ScopeNodeId",
                principalTable: "structure_nodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_church_members_structure_nodes_ChurchId_ParentNodeId",
                table: "church_members");

            migrationBuilder.DropForeignKey(
                name: "FK_role_assignments_structure_nodes_ScopeNodeId",
                table: "role_assignments");

            migrationBuilder.DropTable(
                name: "structure_nodes");

            migrationBuilder.DropTable(
                name: "structure_layers");

            migrationBuilder.DropTable(
                name: "structure_templates");

            migrationBuilder.DropIndex(
                name: "IX_role_assignments_ScopeNodeId",
                table: "role_assignments");

            migrationBuilder.DropColumn(
                name: "ScopeNodeId",
                table: "role_assignments");

            migrationBuilder.RenameColumn(
                name: "ParentNodeId",
                table: "church_members",
                newName: "CellId");

            migrationBuilder.RenameIndex(
                name: "IX_church_members_ParentNodeId",
                table: "church_members",
                newName: "IX_church_members_CellId");

            migrationBuilder.RenameIndex(
                name: "IX_church_members_ChurchId_ParentNodeId",
                table: "church_members",
                newName: "IX_church_members_ChurchId_CellId");

            migrationBuilder.AddForeignKey(
                name: "FK_church_members_structure_cells_ChurchId_CellId",
                table: "church_members",
                columns: new[] { "ChurchId", "CellId" },
                principalTable: "structure_cells",
                principalColumns: new[] { "ChurchId", "Id" },
                onDelete: ReferentialAction.Restrict);
        }
    }
}
