using HomeManager.API.Models.Finance;

namespace HomeManager.API.Models.DTOs;

public class RatesResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Dictionary<string, decimal> Rates { get; set; } = new();
    public DateTime UpdatedAt { get; set; }

    public static RatesResponse FromEntity(FinanceRates rates) => new()
    {
        Id = rates.Id,
        HouseholdId = rates.HouseholdId,
        Rates = rates.Rates,
        UpdatedAt = rates.UpdatedAt,
    };

    public static RatesResponse Default(Guid householdId) => new()
    {
        Id = Guid.Empty,
        HouseholdId = householdId,
        Rates = new() { ["BRL"] = 1, ["EUR"] = 6.0m, ["USD"] = 5.5m, ["PYG"] = 0.0007m },
        UpdatedAt = DateTime.UtcNow,
    };
}
