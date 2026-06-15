using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanningItemIdToTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "planning_item_id",
                schema: "finance",
                table: "transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_transactions_planning_item_id",
                schema: "finance",
                table: "transactions",
                column: "planning_item_id");

            migrationBuilder.AddForeignKey(
                name: "FK_transactions_planning_items_planning_item_id",
                schema: "finance",
                table: "transactions",
                column: "planning_item_id",
                principalSchema: "finance",
                principalTable: "planning_items",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transactions_planning_items_planning_item_id",
                schema: "finance",
                table: "transactions");

            migrationBuilder.DropIndex(
                name: "IX_transactions_planning_item_id",
                schema: "finance",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "planning_item_id",
                schema: "finance",
                table: "transactions");
        }
    }
}
