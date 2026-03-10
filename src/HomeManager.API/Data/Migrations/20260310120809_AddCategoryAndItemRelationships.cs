using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryAndItemRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "category_id",
                schema: "inventory",
                table: "items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "location_id",
                schema: "inventory",
                table: "items",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "categories",
                schema: "inventory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_categories_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_items_category_id",
                schema: "inventory",
                table: "items",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_location_id",
                schema: "inventory",
                table: "items",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_categories_household_id",
                schema: "inventory",
                table: "categories",
                column: "household_id");

            migrationBuilder.AddForeignKey(
                name: "FK_items_categories_category_id",
                schema: "inventory",
                table: "items",
                column: "category_id",
                principalSchema: "inventory",
                principalTable: "categories",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_items_locations_location_id",
                schema: "inventory",
                table: "items",
                column: "location_id",
                principalSchema: "inventory",
                principalTable: "locations",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_items_categories_category_id",
                schema: "inventory",
                table: "items");

            migrationBuilder.DropForeignKey(
                name: "FK_items_locations_location_id",
                schema: "inventory",
                table: "items");

            migrationBuilder.DropTable(
                name: "categories",
                schema: "inventory");

            migrationBuilder.DropIndex(
                name: "IX_items_category_id",
                schema: "inventory",
                table: "items");

            migrationBuilder.DropIndex(
                name: "IX_items_location_id",
                schema: "inventory",
                table: "items");

            migrationBuilder.DropColumn(
                name: "category_id",
                schema: "inventory",
                table: "items");

            migrationBuilder.DropColumn(
                name: "location_id",
                schema: "inventory",
                table: "items");
        }
    }
}
