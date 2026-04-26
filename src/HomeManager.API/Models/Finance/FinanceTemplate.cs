using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Finance;

[Table("templates", Schema = "finance")]
public class FinanceTemplate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("account_id")]
    public Guid? AccountId { get; set; }

    [Column("description")]
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("currency")]
    [Required]
    [MaxLength(10)]
    public string Currency { get; set; } = "BRL";

    [Column("category")]
    [MaxLength(10)]
    public string? Category { get; set; } // NULL = income template; 'lf'|'cf'|'co'|'mt'|'pr'|'es' = expense

    [Column("day_of_month")]
    public int DayOfMonth { get; set; } // 1-31

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public FinanceAccount? Account { get; set; }
    public ICollection<FinanceTransaction> Transactions { get; set; } = new List<FinanceTransaction>();
}
