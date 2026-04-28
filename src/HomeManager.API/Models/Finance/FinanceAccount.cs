using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Finance;

[Table("accounts", Schema = "finance")]
public class FinanceAccount
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("owner_id")]
    public Guid? OwnerId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("currency")]
    [Required]
    [MaxLength(10)]
    public string Currency { get; set; } = "BRL";

    [Column("type")]
    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "account"; // 'account' | 'cc'

    [Column("close_day")]
    public int? CloseDay { get; set; } // CC only: day invoice closes (1-31)

    [Column("close_month_is_next")]
    public bool CloseMonthIsNext { get; set; } = false; // CC only: true when close_day is in the following month (e.g. closes on 2nd of next month)

    [Column("due_day")]
    public int? DueDay { get; set; } // CC only: day payment is due (1-31)

    [Column("limit")]
    public decimal? Limit { get; set; } // CC only: credit limit

    [Column("balance")]
    public decimal? Balance { get; set; } // current balance override

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public User? Owner { get; set; }
    public ICollection<FinanceTransaction> Transactions { get; set; } = new List<FinanceTransaction>();
    public ICollection<FinanceTemplate> Templates { get; set; } = new List<FinanceTemplate>();
}
