namespace HomeManager.API.Models.DTOs.Requests;

public record UpdateAccountRequest(
    string? Name,
    string? Currency,
    string? Type,
    int? CloseDay,
    int? DueDay,
    decimal? Limit
);
