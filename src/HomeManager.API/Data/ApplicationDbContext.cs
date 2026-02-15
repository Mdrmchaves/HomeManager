using HomeManager.API.Models.Inventory;
using HomeManager.API.Models.Shared;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Shared
    public DbSet<User> Users { get; set; }
    public DbSet<Household> Households { get; set; }
    public DbSet<HouseholdUser> HouseholdUsers { get; set; }

    // Inventory
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<ItemList> ItemLists { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Composite key para HouseholdUser
        modelBuilder.Entity<HouseholdUser>()
            .HasKey(hu => new { hu.UserId, hu.HouseholdId });

        // Relationships
        modelBuilder.Entity<HouseholdUser>()
            .HasOne(hu => hu.User)
            .WithMany(u => u.HouseholdUsers)
            .HasForeignKey(hu => hu.UserId);

        modelBuilder.Entity<HouseholdUser>()
            .HasOne(hu => hu.Household)
            .WithMany(h => h.HouseholdUsers)
            .HasForeignKey(hu => hu.HouseholdId);

        modelBuilder.Entity<InventoryItem>()
            .HasOne(i => i.Household)
            .WithMany(h => h.Items)
            .HasForeignKey(i => i.HouseholdId);

        modelBuilder.Entity<InventoryItem>()
            .HasOne(i => i.List)
            .WithMany(l => l.Items)
            .HasForeignKey(i => i.ListId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}