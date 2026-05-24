using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HomeManager.API.Models.Shared;

[Table("households", Schema = "shared")]
public class Household
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("invite_code")]
    [Required]
    [MaxLength(50)]
    public string InviteCode { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("default_currency")]
    [Required]
    [MaxLength(10)]
    public string DefaultCurrency { get; set; } = "BRL";

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<HouseholdUser> HouseholdUsers { get; set; } = new List<HouseholdUser>();
    public ICollection<Inventory.InventoryItem> Items { get; set; } = new List<Inventory.InventoryItem>();
    public ICollection<Inventory.Location> Locations { get; set; } = new List<Inventory.Location>();
    public ICollection<Inventory.Category> Categories { get; set; } = new List<Inventory.Category>();
}