namespace HomeManager.API.Models.DTOs.Requests;

public record UpdateTaskRecurrenceRequest(
    Guid? AssigneeId,
    bool? IsActive
);
