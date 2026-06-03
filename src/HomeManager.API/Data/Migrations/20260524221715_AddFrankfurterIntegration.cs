using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFrankfurterIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "applied_rate",
                schema: "finance",
                table: "transactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "default_currency",
                schema: "shared",
                table: "households",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "BRL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "applied_rate",
                schema: "finance",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "default_currency",
                schema: "shared",
                table: "households");

        }
    }
}
