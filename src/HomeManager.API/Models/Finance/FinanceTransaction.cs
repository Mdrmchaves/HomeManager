using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Finance;

[Table("transactions", Schema = "finance")]
public class FinanceTransaction
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("created_by")]
    public Guid? CreatedBy { get; set; }

    [Column("account_id")]
    public Guid? AccountId { get; set; }

    [Column("from_template_id")]
    public Guid? FromTemplateId { get; set; }

    [Column("description")]
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; } // always positive

    [Column("currency")]
    [Required]
    [MaxLength(10)]
    public string Currency { get; set; } = "BRL";

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("ref_month")]
    [Required]
    [MaxLength(7)]
    public string RefMonth { get; set; } = string.Empty; // YYYY-MM — computed from Date + account CloseDay

    [Column("type")]
    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "expense"; // 'income' | 'expense'

    [Column("category")]
    [MaxLength(10)]
    public string? Category { get; set; } // NULL for income; 'lf'|'cf'|'co'|'mt'|'pr'|'es' for expense

    // Transfer fields (type == 'transfer' only)
    [Column("to_account_id")]
    public Guid? ToAccountId { get; set; }

    [Column("to_amount")]
    public decimal? ToAmount { get; set; } // amount received (may differ when currencies differ)

    [Column("applied_rate")]
    public decimal? AppliedRate { get; set; } // rate at transaction date: 1 unit of Currency = X units of household.DefaultCurrency

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public User? Creator { get; set; }
    public FinanceAccount? Account { get; set; }
    public FinanceAccount? ToAccount { get; set; }
    public FinanceTemplate? FromTemplate { get; set; }
}
