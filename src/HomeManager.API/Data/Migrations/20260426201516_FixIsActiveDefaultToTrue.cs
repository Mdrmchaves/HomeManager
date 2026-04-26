using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixIsActiveDefaultToTrue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Previous migration added is_active with DEFAULT false, making all existing
            // accounts inactive. Fix by setting all rows to active.
            migrationBuilder.Sql("UPDATE finance.accounts SET is_active = true;");

            // Also correct the column default for future inserts
            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                schema: "finance",
                table: "accounts",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
