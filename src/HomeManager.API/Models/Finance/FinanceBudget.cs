using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Finance;

[Table("budget", Schema = "finance")]
public class FinanceBudget
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; } // UNIQUE — one budget per household

    [Column("income")]
    public decimal Income { get; set; } = 0;

    [Column("income_currency")]
    [Required]
    [MaxLength(10)]
    public string IncomeCurrency { get; set; } = "BRL";

    // goals: { "lf": 10, "cf": 40, "co": 20, "mt": 10, "pr": 10, "es": 10 }
    // Values are percentages (0-100); sum should ideally be <= 100
    [Column("goals", TypeName = "jsonb")]
    public Dictionary<string, decimal> Goals { get; set; } = new()
    {
        ["lf"] = 0, ["cf"] = 0, ["co"] = 0, ["mt"] = 0, ["pr"] = 0, ["es"] = 0
    };

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
}
