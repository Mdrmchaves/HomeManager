using HomeManager.API.Models.Inventory;
using HomeManager.API.Models.Shared;
using Microsoft.EntityFrameworkCore;

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
    }
}
