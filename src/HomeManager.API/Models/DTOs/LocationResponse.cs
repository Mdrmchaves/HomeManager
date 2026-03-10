namespace HomeManager.API.Models.DTOs;

public record LocationResponse(
    Guid Id,
    Guid HouseholdId,
    string Name,
    string? Icon,
    DateTime CreatedAt
);
