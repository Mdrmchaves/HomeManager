using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Inventory;

[Table("pantry_items", Schema = "inventory")]
public class PantryItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("location_id")]
    public Guid? LocationId { get; set; }

    [Column("category_id")]
    public Guid? CategoryId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Column("notes")]
    [MaxLength(500)]
    public string? Notes { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; }

    [Column("unit")]
    [MaxLength(20)]
    public string? Unit { get; set; }

    /// <summary>
    /// Low-stock alert threshold. When Quantity &lt;= MinQuantity the item is considered "low".
    /// Null means no threshold is configured.
    /// </summary>
    [Column("min_quantity")]
    public decimal? MinQuantity { get; set; }

    [Column("expiration_date")]
    public DateTime? ExpirationDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public Location? Location { get; set; }
    public Category? Category { get; set; }
}
