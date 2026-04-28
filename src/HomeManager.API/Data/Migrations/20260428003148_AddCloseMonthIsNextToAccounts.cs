using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCloseMonthIsNextToAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "close_month_is_next",
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
                name: "close_month_is_next",
                schema: "finance",
                table: "accounts");
        }
    }
}
