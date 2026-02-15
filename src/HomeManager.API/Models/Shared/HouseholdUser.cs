using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HomeManager.API.Models.Shared;

[Table("household_users", Schema = "shared")]
public class HouseholdUser
{
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("household_id")]
    public Guid HouseholdId { get; set; }

    [Column("role")]
    [MaxLength(50)]
    public string Role { get; set; } = "member";

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Household Household { get; set; } = null!;
}