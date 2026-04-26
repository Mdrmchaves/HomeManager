namespace HomeManager.API.Models.DTOs.Requests;

public record UpsertBudgetRequest(
    Guid HouseholdId,
    decimal Income,
    string IncomeCurrency,
    Dictionary<string, decimal> Goals   // keys: lf, cf, co, mt, pr, es; values: 0-100
);
