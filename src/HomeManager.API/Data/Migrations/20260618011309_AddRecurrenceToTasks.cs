using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurrenceToTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "recurrence_id",
                schema: "tasks",
                table: "tasks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "task_recurrences",
                schema: "tasks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    household_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assignee_id = table.Column<Guid>(type: "uuid", nullable: true),
                    pattern = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    recurrence_day = table.Column<int>(type: "integer", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task_recurrences", x => x.id);
                    table.ForeignKey(
                        name: "FK_task_recurrences_households_household_id",
                        column: x => x.household_id,
                        principalSchema: "shared",
                        principalTable: "households",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_task_recurrences_users_assignee_id",
                        column: x => x.assignee_id,
                        principalSchema: "shared",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_task_recurrences_users_created_by",
                        column: x => x.created_by,
                        principalSchema: "shared",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tasks_recurrence_id",
                schema: "tasks",
                table: "tasks",
                column: "recurrence_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_recurrences_assignee_id",
                schema: "tasks",
                table: "task_recurrences",
                column: "assignee_id");

            migrationBuilder.CreateIndex(
                name: "IX_task_recurrences_created_by",
                schema: "tasks",
                table: "task_recurrences",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_task_recurrences_household_id_pattern_recurrence_day_is_act~",
                schema: "tasks",
                table: "task_recurrences",
                columns: new[] { "household_id", "pattern", "recurrence_day", "is_active" });

            migrationBuilder.AddForeignKey(
                name: "FK_tasks_task_recurrences_recurrence_id",
                schema: "tasks",
                table: "tasks",
                column: "recurrence_id",
                principalSchema: "tasks",
                principalTable: "task_recurrences",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tasks_task_recurrences_recurrence_id",
                schema: "tasks",
                table: "tasks");

            migrationBuilder.DropTable(
                name: "task_recurrences",
                schema: "tasks");

            migrationBuilder.DropIndex(
                name: "IX_tasks_recurrence_id",
                schema: "tasks",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "recurrence_id",
                schema: "tasks",
                table: "tasks");
        }
    }
}
