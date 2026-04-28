namespace HomeManager.API.Models.DTOs.Requests;

public record UpdateAccountRequest(
    string? Name,
    string? Currency,
    string? Type,
    int? CloseDay,
    bool? CloseMonthIsNext,
    int? DueDay,
    decimal? Limit,
    decimal? Balance,
    bool? IsActive
);
