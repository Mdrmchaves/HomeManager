using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Finance;

[Table("planning_items", Schema = "finance")]
public class FinancePlanningItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

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
    public string? Category { get; set; } // NULL = income/general; 'lf'|'cf'|'co'|'mt'|'pr'|'es' = expense

    [Column("type")]
    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "fixed"; // 'fixed' | 'installment'

    [Column("day_of_month")]
    public int? DayOfMonth { get; set; } // 1-31, nullable

    [Column("total_installments")]
    public int? TotalInstallments { get; set; } // installment only

    [Column("installments_paid")]
    public int InstallmentsPaid { get; set; } = 0;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
}
