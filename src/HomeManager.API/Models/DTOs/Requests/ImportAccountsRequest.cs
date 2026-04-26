namespace HomeManager.API.Models.DTOs.Requests;

public record ImportAccountsRequest(
    Guid HouseholdId,
    List<ImportAccountItem> Accounts
);

public record ImportAccountItem(
    string Name,
    string Currency,
    string Type,
    int? CloseDay,
    int? DueDay,
    decimal? Limit
);
