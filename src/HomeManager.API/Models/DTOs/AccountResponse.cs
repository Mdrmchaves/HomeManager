using HomeManager.API.Models.Finance;

namespace HomeManager.API.Models.DTOs;

public class AccountResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int? CloseDay { get; set; }
    public int? DueDay { get; set; }
    public decimal? Limit { get; set; }
    public decimal? InitialBalance { get; set; }
    public decimal Balance { get; set; }
    public DateTime CreatedAt { get; set; }

    public static AccountResponse FromEntity(FinanceAccount account, decimal computedBalance = 0m) => new()
    {
        Id = account.Id,
        HouseholdId = account.HouseholdId,
        OwnerId = account.OwnerId,
        Name = account.Name,
        Currency = account.Currency,
        Type = account.Type,
        CloseDay = account.CloseDay,
        DueDay = account.DueDay,
        Limit = account.Limit,
        InitialBalance = account.Balance,
        Balance = computedBalance,
        CreatedAt = account.CreatedAt,
    };
}
