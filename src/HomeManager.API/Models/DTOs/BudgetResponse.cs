using HomeManager.API.Models.Finance;

namespace HomeManager.API.Models.DTOs;

public class BudgetResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public decimal Income { get; set; }
    public string IncomeCurrency { get; set; } = string.Empty;
    public Dictionary<string, decimal> Goals { get; set; } = new();
    public DateTime UpdatedAt { get; set; }

    public static BudgetResponse FromEntity(FinanceBudget budget) => new()
    {
        Id = budget.Id,
        HouseholdId = budget.HouseholdId,
        Income = budget.Income,
        IncomeCurrency = budget.IncomeCurrency,
        Goals = budget.Goals,
        UpdatedAt = budget.UpdatedAt,
    };

    public static BudgetResponse Default(Guid householdId) => new()
    {
        Id = Guid.Empty,
        HouseholdId = householdId,
        Income = 0,
        IncomeCurrency = "BRL",
        Goals = new() { ["lf"] = 0, ["cf"] = 0, ["co"] = 0, ["mt"] = 0, ["pr"] = 0, ["es"] = 0 },
        UpdatedAt = DateTime.UtcNow,
    };
}
