using HomeManager.API.Models.Shared;

namespace HomeManager.API.Models.DTOs;

public class UserResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static UserResponse FromEntity(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt,
    };
}
