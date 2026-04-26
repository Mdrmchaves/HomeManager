using HomeManager.API.Models.Finance;

namespace HomeManager.API.Models.DTOs;

public class TemplateResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? AccountId { get; set; }
    public string? AccountName { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int DayOfMonth { get; set; }
    public DateTime CreatedAt { get; set; }

    public static TemplateResponse FromEntity(FinanceTemplate template) => new()
    {
        Id = template.Id,
        HouseholdId = template.HouseholdId,
        AccountId = template.AccountId,
        AccountName = template.Account?.Name,
        Description = template.Description,
        Amount = template.Amount,
        Currency = template.Currency,
        Category = template.Category,
        DayOfMonth = template.DayOfMonth,
        CreatedAt = template.CreatedAt,
    };
}
