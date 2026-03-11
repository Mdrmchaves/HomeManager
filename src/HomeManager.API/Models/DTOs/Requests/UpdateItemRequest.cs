namespace HomeManager.API.Models.DTOs.Requests;

public record UpdateItemRequest(
    string? Name,
    string? Description,
    decimal? Value,
    string? PhotoUrl,
    string? Location,       // Legacy free-text field; prefer LocationId
    string? Destination,
    Guid? OwnerId,
    string? Tags,
    Guid? ListId,
    Guid? LocationId,
    Guid? CategoryId,
    int? Quantity
);