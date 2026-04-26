namespace HomeManager.API.Models.DTOs.Requests;

public record ImportTransactionsRequest(
    Guid HouseholdId,
    List<ImportTransactionItem> Transactions
);

public record ImportTransactionItem(
    Guid? AccountId,
    string Description,
    decimal Amount,
    string Currency,
    DateOnly Date,
    string Type,
    string? Category,
    string? RefMonth
);
