namespace HomeManager.API.Models.DTOs.Requests;

public record CreateTaskRequest(
    Guid HouseholdId,
    string Title,
    string? Description,
    Guid? AssigneeId,
    DateTime? DueDate,
    string? RecurrencePattern,
    int? RecurrenceDay
);
