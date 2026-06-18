using HomeManager.API.Models.Finance;
using HomeManager.API.Models.Inventory;
using HomeManager.API.Models.Shared;
using HomeManager.API.Models.Tasks;
using Microsoft.EntityFrameworkCore;
using TaskEntity = HomeManager.API.Models.Tasks.Task;

namespace HomeManager.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // Shared
    public DbSet<User> Users { get; set; }
    public DbSet<Household> Households { get; set; }
    public DbSet<HouseholdUser> HouseholdUsers { get; set; }

    // Inventory
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<ItemList> ItemLists { get; set; }
    public DbSet<Location> Locations { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<PantryItem> PantryItems { get; set; }

    // Tasks
    public DbSet<TaskEntity> Tasks { get; set; }
    public DbSet<TaskRecurrence> TaskRecurrences { get; set; }

    // Finance
    public DbSet<FinanceAccount> FinanceAccounts { get; set; }
    public DbSet<FinanceTransaction> FinanceTransactions { get; set; }
    public DbSet<FinanceBudget> FinanceBudgets { get; set; }
    public DbSet<FinanceRates> FinanceRates { get; set; }
    public DbSet<FinancePlanningItem> FinancePlanningItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Composite key para HouseholdUser
        modelBuilder.Entity<HouseholdUser>().HasKey(hu => new { hu.UserId, hu.HouseholdId });

        // Relationships
        modelBuilder
            .Entity<HouseholdUser>()
            .HasOne(hu => hu.User)
            .WithMany(u => u.HouseholdUsers)
            .HasForeignKey(hu => hu.UserId);

        modelBuilder
            .Entity<HouseholdUser>()
            .HasOne(hu => hu.Household)
            .WithMany(h => h.HouseholdUsers)
            .HasForeignKey(hu => hu.HouseholdId);

        modelBuilder
            .Entity<InventoryItem>()
            .HasOne(i => i.Household)
            .WithMany(h => h.Items)
            .HasForeignKey(i => i.HouseholdId);

        modelBuilder
            .Entity<InventoryItem>()
            .HasOne(i => i.List)
            .WithMany(l => l.Items)
            .HasForeignKey(i => i.ListId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<Location>()
            .HasOne(l => l.Household)
            .WithMany(h => h.Locations)
            .HasForeignKey(l => l.HouseholdId);

        modelBuilder
            .Entity<Category>()
            .HasOne(c => c.Household)
            .WithMany(h => h.Categories)
            .HasForeignKey(c => c.HouseholdId);

        modelBuilder
            .Entity<InventoryItem>()
            .HasOne(i => i.LocationRef)
            .WithMany(l => l.Items)
            .HasForeignKey(i => i.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<InventoryItem>()
            .HasOne(i => i.Category)
            .WithMany(c => c.Items)
            .HasForeignKey(i => i.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // PantryItem uses .WithMany() (no inverse collection on Location/Category)
        // to keep those entities clean — pantry items are a separate domain.
        modelBuilder
            .Entity<PantryItem>()
            .HasOne(p => p.Household)
            .WithMany()
            .HasForeignKey(p => p.HouseholdId);

        modelBuilder
            .Entity<PantryItem>()
            .HasOne(p => p.Location)
            .WithMany()
            .HasForeignKey(p => p.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<PantryItem>()
            .HasOne(p => p.Category)
            .WithMany()
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Tasks ────────────────────────────────────────────────────────
        modelBuilder.Entity<TaskEntity>(b =>
        {
            b.HasOne(t => t.Household)
                .WithMany()
                .HasForeignKey(t => t.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(t => t.Assignee)
                .WithMany()
                .HasForeignKey(t => t.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(t => t.CompletedByUser)
                .WithMany()
                .HasForeignKey(t => t.CompletedBy)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(t => t.CreatedByUser)
                .WithMany()
                .HasForeignKey(t => t.CreatedBy)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(t => t.Recurrence)
                .WithMany(r => r.Tasks)
                .HasForeignKey(t => t.RecurrenceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TaskRecurrence>(b =>
        {
            b.HasOne(r => r.Household)
                .WithMany()
                .HasForeignKey(r => r.HouseholdId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(r => r.Assignee)
                .WithMany()
                .HasForeignKey(r => r.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(r => r.CreatedByUser)
                .WithMany()
                .HasForeignKey(r => r.CreatedBy)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(r => new { r.HouseholdId, r.Pattern, r.RecurrenceDay, r.IsActive });
        });

        // ── Finance ──────────────────────────────────────────────────────
        // FinanceAccount
        modelBuilder
            .Entity<FinanceAccount>()
            .HasOne(a => a.Household)
            .WithMany()
            .HasForeignKey(a => a.HouseholdId);

        modelBuilder
            .Entity<FinanceAccount>()
            .HasOne(a => a.Owner)
            .WithMany()
            .HasForeignKey(a => a.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // FinancePlanningItem
        modelBuilder
            .Entity<FinancePlanningItem>()
            .HasOne(p => p.Household)
            .WithMany()
            .HasForeignKey(p => p.HouseholdId);

        // FinanceTransaction
        modelBuilder
            .Entity<FinanceTransaction>()
            .HasOne(tx => tx.Household)
            .WithMany()
            .HasForeignKey(tx => tx.HouseholdId);

        modelBuilder
            .Entity<FinanceTransaction>()
            .HasOne(tx => tx.Creator)
            .WithMany()
            .HasForeignKey(tx => tx.CreatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<FinanceTransaction>()
            .HasOne(tx => tx.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(tx => tx.AccountId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<FinanceTransaction>()
            .HasOne(tx => tx.ToAccount)
            .WithMany()
            .HasForeignKey(tx => tx.ToAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<FinanceTransaction>()
            .HasOne(tx => tx.PlanningItem)
            .WithMany()
            .HasForeignKey(tx => tx.PlanningItemId)
            .OnDelete(DeleteBehavior.SetNull);

        // FinanceBudget — unique per household
        modelBuilder
            .Entity<FinanceBudget>()
            .HasOne(b => b.Household)
            .WithMany()
            .HasForeignKey(b => b.HouseholdId);

        modelBuilder
            .Entity<FinanceBudget>()
            .HasIndex(b => b.HouseholdId)
            .IsUnique();

        modelBuilder
            .Entity<FinanceBudget>()
            .Property(b => b.Goals)
            .HasColumnType("jsonb");

        // FinanceRates — unique per household
        modelBuilder
            .Entity<FinanceRates>()
            .HasOne(r => r.Household)
            .WithMany()
            .HasForeignKey(r => r.HouseholdId);

        modelBuilder
            .Entity<FinanceRates>()
            .HasIndex(r => r.HouseholdId)
            .IsUnique();

        modelBuilder
            .Entity<FinanceRates>()
            .Property(r => r.Rates)
            .HasColumnType("jsonb");
    }
}
