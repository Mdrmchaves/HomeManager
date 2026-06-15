using HomeManager.API.Models.Finance;

namespace HomeManager.API.Models.DTOs;

public class PlanningItemResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Type { get; set; } = "fixed";
    public int? DayOfMonth { get; set; }
    public int? TotalInstallments { get; set; }
    public int InstallmentsPaid { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool PaidThisMonth { get; set; } = false;
    public Guid? PaidTransactionId { get; set; }
    public bool PaidViaCC { get; set; } = false;

    public static PlanningItemResponse FromEntity(
        FinancePlanningItem item,
        bool paidThisMonth = false,
        Guid? paidTransactionId = null,
        bool paidViaCC = false) => new()
    {
        Id = item.Id,
        HouseholdId = item.HouseholdId,
        Description = item.Description,
        Amount = item.Amount,
        Currency = item.Currency,
        Category = item.Category,
        Type = item.Type,
        DayOfMonth = item.DayOfMonth,
        TotalInstallments = item.TotalInstallments,
        InstallmentsPaid = item.InstallmentsPaid,
        IsActive = item.IsActive,
        CreatedAt = item.CreatedAt,
        PaidThisMonth = paidThisMonth,
        PaidTransactionId = paidTransactionId,
        PaidViaCC = paidViaCC,
    };
}
