using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Inventory;

[Table("lists", Schema = "inventory")]
public class ItemList
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

    [Column("type")]
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public ICollection<InventoryItem> Items { get; set; } = new List<InventoryItem>();
}