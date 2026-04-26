namespace HomeManager.API.Models.DTOs.Requests;

public record CreateTemplateRequest(
    Guid HouseholdId,
    Guid? AccountId,
    string Description,
    decimal Amount,
    string Currency,
    string? Category,     // 'lf'|'cf'|'co'|'mt'|'pr'|'es' (expense); null = income template
    int DayOfMonth        // 1-31
);
