using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.Tasks;

[Table("tasks", Schema = "tasks")]
public class Task
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("title")]
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("assignee_id")]
    public Guid? AssigneeId { get; set; }

    [Column("due_date")]
    public DateTime? DueDate { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "active";

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("completed_by")]
    public Guid? CompletedBy { get; set; }

    [Column("created_by")]
    public Guid CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Household Household { get; set; } = null!;
    public User? Assignee { get; set; }
    public User? CompletedByUser { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
