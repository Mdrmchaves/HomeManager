using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancePaymentRecurrences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "task_recurrence_id",
                schema: "finance",
                table: "planning_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "task_recurrence_id",
                schema: "finance",
                table: "accounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_planning_items_task_recurrence_id",
                schema: "finance",
                table: "planning_items",
                column: "task_recurrence_id");

            migrationBuilder.CreateIndex(
                name: "IX_accounts_task_recurrence_id",
                schema: "finance",
                table: "accounts",
                column: "task_recurrence_id");

            migrationBuilder.AddForeignKey(
                name: "FK_accounts_task_recurrences_task_recurrence_id",
                schema: "finance",
                table: "accounts",
                column: "task_recurrence_id",
                principalSchema: "tasks",
                principalTable: "task_recurrences",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_planning_items_task_recurrences_task_recurrence_id",
                schema: "finance",
                table: "planning_items",
                column: "task_recurrence_id",
                principalSchema: "tasks",
                principalTable: "task_recurrences",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_accounts_task_recurrences_task_recurrence_id",
                schema: "finance",
                table: "accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_planning_items_task_recurrences_task_recurrence_id",
                schema: "finance",
                table: "planning_items");

            migrationBuilder.DropIndex(
                name: "IX_planning_items_task_recurrence_id",
                schema: "finance",
                table: "planning_items");

            migrationBuilder.DropIndex(
                name: "IX_accounts_task_recurrence_id",
                schema: "finance",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "task_recurrence_id",
                schema: "finance",
                table: "planning_items");

            migrationBuilder.DropColumn(
                name: "task_recurrence_id",
                schema: "finance",
                table: "accounts");
        }
    }
}
