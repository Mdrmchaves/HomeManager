using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;
using TaskEntity = HomeManager.API.Models.Tasks.Task;

namespace HomeManager.API.Models.Tasks;

[Table("task_recurrences", Schema = "tasks")]
public class TaskRecurrence
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("assignee_id")]
    public Guid? AssigneeId { get; set; }

    [Column("pattern")]
    [MaxLength(20)]
    public string Pattern { get; set; } = string.Empty; // "daily" | "weekly" | "monthly"

    [Column("recurrence_day")]
    public int? RecurrenceDay { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_by")]
    public Guid CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public User? Assignee { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public ICollection<TaskEntity> Tasks { get; set; } = [];
}
