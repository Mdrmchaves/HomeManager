namespace HomeManager.API.Models.DTOs.Requests;

public record UpdateTaskRequest(
    string? Title,
    string? Description,
    Guid? AssigneeId,
    DateTime? DueDate
);
