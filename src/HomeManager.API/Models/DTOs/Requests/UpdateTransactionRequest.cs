namespace HomeManager.API.Models.DTOs.Requests;

public record UpdateTransactionRequest(
    Guid? AccountId,
    string? Description,
    decimal? Amount,
    string? Currency,
    DateOnly? Date,
    string? Type,
    string? Category,
    string? RefMonth,
    Guid? ToAccountId,
    decimal? ToAmount,
    Guid? PlanningItemId = null,
    bool ClearPlanningItemId = false
);
