namespace HomeManager.API.Models.DTOs.Requests;

public record CreateTransactionRequest(
    Guid HouseholdId,
    Guid? AccountId,
    string Description,
    decimal Amount,
    string Currency,
    DateOnly Date,
    string Type,          // 'income' | 'expense'
    string? Category,     // 'lf'|'cf'|'co'|'mt'|'pr'|'es' (expense only)
    string? RefMonth      // YYYY-MM; if null, computed from Date + account CloseDay
);
