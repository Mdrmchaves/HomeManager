namespace HomeManager.API.Models.DTOs.Requests;

public record CreatePantryItemRequest(
    Guid HouseholdId,
    string Name,
    decimal Quantity,
    string? Unit,
    decimal? MinQuantity,
    DateTime? ExpirationDate,
    Guid? LocationId,
    Guid? CategoryId,
    string? Notes
);
