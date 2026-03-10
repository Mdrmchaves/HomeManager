namespace HomeManager.API.Models.DTOs;

public record CategoryResponse(
    Guid Id,
    Guid HouseholdId,
    string Name,
    string Type,
    DateTime CreatedAt
);
