using HomeManager.API.Models.Finance;

namespace HomeManager.API.Models.DTOs;

public class TransactionResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? AccountId { get; set; }
    public string? AccountName { get; set; }
    public Guid? FromTemplateId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string RefMonth { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Category { get; set; }
    public DateTime CreatedAt { get; set; }

    public static TransactionResponse FromEntity(FinanceTransaction tx) => new()
    {
        Id = tx.Id,
        HouseholdId = tx.HouseholdId,
        CreatedBy = tx.CreatedBy,
        AccountId = tx.AccountId,
        AccountName = tx.Account?.Name,
        FromTemplateId = tx.FromTemplateId,
        Description = tx.Description,
        Amount = tx.Amount,
        Currency = tx.Currency,
        Date = tx.Date,
        RefMonth = tx.RefMonth,
        Type = tx.Type,
        Category = tx.Category,
        CreatedAt = tx.CreatedAt,
    };
}
