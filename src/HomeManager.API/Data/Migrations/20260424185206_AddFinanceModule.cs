using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "finance");

            migrationBuilder.CreateTable(
                name: "accounts",
                schema: "finance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    close_day = table.Column<int>(type: "integer", nullable: true),
                    due_day = table.Column<int>(type: "integer", nullable: true),
                    limit = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accounts", x => x.id);
                    table.ForeignKey(
                        name: "FK_accounts_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_accounts_users_owner_id",
                        column: x => x.owner_id,
                        principalSchema: "shared",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "budget",
                schema: "finance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    income = table.Column<decimal>(type: "numeric", nullable: false),
                    income_currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    goals = table.Column<Dictionary<string, decimal>>(type: "jsonb", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_budget", x => x.id);
                    table.ForeignKey(
                        name: "FK_budget_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rates",
                schema: "finance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    rates = table.Column<Dictionary<string, decimal>>(type: "jsonb", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rates", x => x.id);
                    table.ForeignKey(
                        name: "FK_rates_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "templates",
                schema: "finance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    amount = table.Column<decimal>(type: "numeric", nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    category = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    day_of_month = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_templates", x => x.id);
                    table.ForeignKey(
                        name: "FK_templates_accounts_account_id",
                        column: x => x.account_id,
                        principalSchema: "finance",
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_templates_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "transactions",
                schema: "finance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    from_template_id = table.Column<Guid>(type: "uuid", nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    amount = table.Column<decimal>(type: "numeric", nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    ref_month = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    category = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transactions", x => x.id);
                    table.ForeignKey(
                        name: "FK_transactions_accounts_account_id",
                        column: x => x.account_id,
                        principalSchema: "finance",
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_transactions_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transactions_templates_from_template_id",
                        column: x => x.from_template_id,
                        principalSchema: "finance",
                        principalTable: "templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_transactions_users_created_by",
                        column: x => x.created_by,
                        principalSchema: "shared",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_accounts_household_id",
                schema: "finance",
                table: "accounts",
                column: "household_id");

            migrationBuilder.CreateIndex(
                name: "IX_accounts_owner_id",
                schema: "finance",
                table: "accounts",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "IX_budget_household_id",
                schema: "finance",
                table: "budget",
                column: "household_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rates_household_id",
                schema: "finance",
                table: "rates",
                column: "household_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_templates_account_id",
                schema: "finance",
                table: "templates",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_templates_household_id",
                schema: "finance",
                table: "templates",
                column: "household_id");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_account_id",
                schema: "finance",
                table: "transactions",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_created_by",
                schema: "finance",
                table: "transactions",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_from_template_id",
                schema: "finance",
                table: "transactions",
                column: "from_template_id");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_household_id",
                schema: "finance",
                table: "transactions",
                column: "household_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "budget",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "rates",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "transactions",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "templates",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "accounts",
                schema: "finance");
        }
    }
}
