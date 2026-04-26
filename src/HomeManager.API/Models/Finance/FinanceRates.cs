using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Finance;

[Table("rates", Schema = "finance")]
public class FinanceRates
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; } // UNIQUE — one rates config per household

    // rates: { "BRL": 1, "EUR": 6.0, "USD": 5.5, "PYG": 0.0007 }
    // All expressed in BRL (how much 1 unit of that currency is worth in R$)
    [Column("rates", TypeName = "jsonb")]
    public Dictionary<string, decimal> Rates { get; set; } = new()
    {
        ["BRL"] = 1, ["EUR"] = 6.0m, ["USD"] = 5.5m, ["PYG"] = 0.0007m
    };

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
}
