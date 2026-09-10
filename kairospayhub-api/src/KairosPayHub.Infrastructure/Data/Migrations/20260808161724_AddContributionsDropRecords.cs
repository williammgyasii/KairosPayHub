using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KairosPayHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContributionsDropRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "records");

            migrationBuilder.CreateTable(
                name: "contributions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProgramId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false, defaultValue: "GHS"),
                    DateSent = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AttachmentKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    EnteredByAuthUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberParentNodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ApprovedByAuthUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RejectedReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_contributions_church_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "church_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_contributions_giving_programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "giving_programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "giving_program_scope_nodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProgramId = table.Column<Guid>(type: "uuid", nullable: false),
                    StructureNodeId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giving_program_scope_nodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_giving_program_scope_nodes_giving_programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "giving_programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_contributions_MemberId",
                table: "contributions",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_contributions_MemberParentNodeId",
                table: "contributions",
                column: "MemberParentNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_contributions_ProgramId",
                table: "contributions",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_contributions_ProgramId_Status",
                table: "contributions",
                columns: new[] { "ProgramId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_giving_program_scope_nodes_ProgramId",
                table: "giving_program_scope_nodes",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_giving_program_scope_nodes_ProgramId_StructureNodeId",
                table: "giving_program_scope_nodes",
                columns: new[] { "ProgramId", "StructureNodeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contributions");

            migrationBuilder.DropTable(
                name: "giving_program_scope_nodes");

            migrationBuilder.CreateTable(
                name: "records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChurchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uuid", nullable: false),
                    VerifiedById = table.Column<Guid>(type: "uuid", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false, defaultValue: "GHS"),
                    DateSent = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Method = table.Column<string>(type: "text", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false, defaultValue: "Manual"),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "Submitted"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    VerifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_records_churches_ChurchId",
                        column: x => x.ChurchId,
                        principalTable: "churches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_records_users_SubmittedById",
                        column: x => x.SubmittedById,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_records_users_VerifiedById",
                        column: x => x.VerifiedById,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_records_ChurchId",
                table: "records",
                column: "ChurchId");

            migrationBuilder.CreateIndex(
                name: "IX_records_ChurchId_Status",
                table: "records",
                columns: new[] { "ChurchId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_records_OrganizationId",
                table: "records",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_records_OrganizationId_ChurchId",
                table: "records",
                columns: new[] { "OrganizationId", "ChurchId" });

            migrationBuilder.CreateIndex(
                name: "IX_records_OrganizationId_DateSent",
                table: "records",
                columns: new[] { "OrganizationId", "DateSent" });

            migrationBuilder.CreateIndex(
                name: "IX_records_SubmittedById",
                table: "records",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_records_VerifiedById",
                table: "records",
                column: "VerifiedById");
        }
    }
}
