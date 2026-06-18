namespace HomeManager.API.Models.DTOs;

public class TaskRecurrenceResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public string Pattern { get; set; } = string.Empty;
    public int? RecurrenceDay { get; set; }
    public bool IsActive { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
