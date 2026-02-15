namespace HomeManager.API.Models.DTOs;

public record UpdateItemRequest(
    string? Name,
    string? Description,
    decimal? Value,
    string? PhotoUrl,
    string? Location,
    string? Destination,
    Guid? OwnerId,
    string? Tags,
    Guid? ListId
);