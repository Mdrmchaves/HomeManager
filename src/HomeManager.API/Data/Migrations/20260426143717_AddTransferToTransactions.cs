using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferToTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "to_account_id",
                schema: "finance",
                table: "transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "to_amount",
                schema: "finance",
                table: "transactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_transactions_to_account_id",
                schema: "finance",
                table: "transactions",
                column: "to_account_id");

            migrationBuilder.AddForeignKey(
                name: "FK_transactions_accounts_to_account_id",
                schema: "finance",
                table: "transactions",
                column: "to_account_id",
                principalSchema: "finance",
                principalTable: "accounts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transactions_accounts_to_account_id",
                schema: "finance",
                table: "transactions");

            migrationBuilder.DropIndex(
                name: "IX_transactions_to_account_id",
                schema: "finance",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "to_account_id",
                schema: "finance",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "to_amount",
                schema: "finance",
                table: "transactions");
        }
    }
}
