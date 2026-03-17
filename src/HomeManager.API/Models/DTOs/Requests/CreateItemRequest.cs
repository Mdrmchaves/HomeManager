namespace HomeManager.API.Models.DTOs.Requests;

public record CreateItemRequest(
    Guid HouseholdId,
    string Name,
    string? Description,
    decimal? Value,
    string? PhotoUrl,
    string? Destination,
    Guid? OwnerId,
    string? Tags,
    Guid? ListId,
    Guid? LocationId,
    Guid? CategoryId,
    int? Quantity
);
