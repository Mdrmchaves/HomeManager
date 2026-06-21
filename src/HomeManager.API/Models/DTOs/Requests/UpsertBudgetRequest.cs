namespace HomeManager.API.Models.DTOs.Requests;

public record UpsertBudgetRequest(
    Guid HouseholdId,
    Dictionary<string, decimal> Goals,  // keys: lf, cf, co, mt, pr, es; values: 0-100
    // Tech debt: Income/IncomeCurrency kept for backward-compat but ignored — dashboard uses actual transaction income
    decimal? Income = null,
    string? IncomeCurrency = null
);
