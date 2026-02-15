namespace HomeManager.API.Models.DTOs;

public record CreateItemRequest(
    Guid HouseholdId,
    string Name,
    string? Description,
    decimal? Value,
    string? Location,
    string? Destination,
    Guid? OwnerId,
    string? Tags,
    Guid? ListId
);
