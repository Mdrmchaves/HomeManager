using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Inventory;

[Table("items", Schema = "inventory")]
public class InventoryItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("value")]
    public decimal? Value { get; set; }

    [Column("photo_url")]
    public string? PhotoUrl { get; set; }

    /// <summary>
    /// Legacy free-text location field. Use <see cref="LocationId"/> instead.
    /// Kept for backward compatibility until data is migrated.
    /// </summary>
    [Obsolete("Use LocationId (FK to inventory.locations) instead.")]
    [Column("location")]
    [MaxLength(255)]
    public string? Location { get; set; }

    [Column("location_id")]
    public Guid? LocationId { get; set; }

    [Column("category_id")]
    public Guid? CategoryId { get; set; }

    [Column("destination")]
    [MaxLength(50)]
    public string? Destination { get; set; }

    [Column("owner_id")]
    public Guid? OwnerId { get; set; }

    [Column("tags", TypeName = "jsonb")]
    public string? Tags { get; set; } // JSON array como string

    [Column("quantity")]
    public int? Quantity { get; set; }

    [Column("list_id")]
    public Guid? ListId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public User? Owner { get; set; }
    public ItemList? List { get; set; }
    public Location? LocationRef { get; set; }
    public Category? Category { get; set; }
}