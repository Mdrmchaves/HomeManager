using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeManager.API.Data.Migrations
{
    /// <summary>
    /// Baseline migration representing the initial database state created via SQL scripts in Supabase.
    /// The Up() method is intentionally empty — the tables already exist. This migration is only
    /// used to establish the EF Core migration history baseline so future migrations apply cleanly.
    ///
    /// To mark this migration as applied without touching the database schema, run:
    ///   dotnet ef database update --connection "Host=..."
    /// OR insert the record manually (see SQL in the project README / migration notes).
    ///
    /// ─── DISCREPANCIES: EF Model vs Actual Supabase Schema ────────────────────────────────────
    ///
    /// 1. UUID PRIMARY KEY DEFAULTS
    ///    EF model: ValueGeneratedOnAdd() — EF generates GUIDs client-side (C#).
    ///    Actual DB: Supabase likely has DEFAULT gen_random_uuid() on PK columns.
    ///    Impact: None at runtime (EF always provides the PK value before insert).
    ///    Action: No change needed; EF client-side generation takes precedence.
    ///
    /// 2. TIMESTAMP COLUMN DEFAULTS
    ///    EF model: created_at / updated_at have no DB-level DEFAULT expression.
    ///              Values are set in C# (DateTime.UtcNow in entity constructors).
    ///    Actual DB: Supabase columns likely have DEFAULT now() or DEFAULT CURRENT_TIMESTAMP.
    ///    Impact: If a row is ever inserted bypassing EF, created_at/updated_at
    ///            will be populated by the DB default. No data loss.
    ///    Action: No change needed for application code. Future migrations could add
    ///            .HasDefaultValueSql("now()") if explicit DB-level defaults are desired.
    ///
    /// 3. FOREIGN KEY CONSTRAINTS
    ///    EF model: Generates FK constraints between schemas (shared.* and inventory.*).
    ///    Actual DB: FK constraints may or may not have been created in the original SQL scripts.
    ///              Supabase does not enforce FKs by default if they were omitted.
    ///    Impact: If FKs are missing in DB, referential integrity is enforced by application only.
    ///    Action: Verify in Supabase Dashboard → Database → Tables whether FK constraints exist.
    ///            If missing, a follow-up migration can add them safely (ALTER TABLE ADD CONSTRAINT).
    ///
    /// 4. INDEXES
    ///    EF model: Generates indexes on FK columns (e.g., IX_items_household_id, IX_items_owner_id).
    ///    Actual DB: These indexes may or may not exist if the original SQL scripts didn't create them.
    ///    Impact: Missing indexes affect query performance, not correctness.
    ///    Action: Verify in Supabase Dashboard. A follow-up migration can create any missing indexes.
    ///
    /// 5. inventory.items.owner_id → shared.users (implicit FK)
    ///    EF model: Inferred a HasOne(Owner).WithMany() relationship via OwnerId foreign key.
    ///    OnModelCreating: This relationship was NOT explicitly configured — EF inferred it
    ///    from the Owner navigation property + OwnerId column.
    ///    Impact: The relationship works correctly at runtime. Consider adding explicit
    ///    Fluent API configuration in OnModelCreating for clarity in future.
    ///
    /// 6. inventory.lists ↔ shared.households (implicit FK)
    ///    EF model: Inferred HasOne(Household).WithMany() for ItemList — NOT configured in
    ///    OnModelCreating. EF inferred it from HouseholdId + Household navigation property.
    ///    Impact: Works correctly. Add explicit config in OnModelCreating for consistency.
    ///
    /// 7. __EFMigrationsHistory TABLE LOCATION
    ///    EF default: Creates __EFMigrationsHistory in the PostgreSQL search_path default schema (public).
    ///    Actual DB: This table does not yet exist — it will be created when this migration is applied.
    ///    Action: Run `dotnet ef database update` or execute the SQL below.
    /// ──────────────────────────────────────────────────────────────────────────────────────────
    /// </summary>
    public partial class InitialBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty.
            // All tables (shared.users, shared.households, shared.household_users,
            // inventory.items, inventory.lists) were created directly in Supabase via SQL scripts.
            // This migration exists solely to establish the EF migration history baseline.
            // Running `dotnet ef database update` will only create __EFMigrationsHistory
            // and insert this record — it will not modify any existing schema objects.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "household_users",
                schema: "shared");

            migrationBuilder.DropTable(
                name: "items",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "lists",
                schema: "inventory");

            migrationBuilder.DropTable(
                name: "users",
                schema: "shared");

            migrationBuilder.DropTable(
                name: "households",
                schema: "shared");
        }
    }
}
