namespace HomeManager.API.Models.DTOs;

public record PantryItemResponse(
    Guid Id,
    Guid HouseholdId,
    string Name,
    decimal Quantity,
    string? Unit,
    decimal? MinQuantity,
    DateTime? ExpirationDate,
    Guid? LocationId,
    string? LocationName,
    Guid? CategoryId,
    string? CategoryName,
    string? Notes,
    string Status,      // "ok" | "low" — computed from Quantity vs MinQuantity
    DateTime CreatedAt,
    DateTime UpdatedAt
);
