using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsActiveToFinanceAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                schema: "finance",
                table: "accounts",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_active",
                schema: "finance",
                table: "accounts");
        }
    }
}
