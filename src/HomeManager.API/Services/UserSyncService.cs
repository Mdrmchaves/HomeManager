using HomeManager.API.Data;
using HomeManager.API.Models.Shared;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services;

public interface IUserSyncService
{
    Task<User> EnsureUserExistsAsync(string userId, string email, string? name);
}

public class UserSyncService : IUserSyncService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UserSyncService> _logger;

    public UserSyncService(ApplicationDbContext context, ILogger<UserSyncService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<User> EnsureUserExistsAsync(string userId, string email, string? name)
    {
        // Parse userId to Guid
        if (!Guid.TryParse(userId, out var userGuid))
        {
            throw new ArgumentException("Invalid user ID format", nameof(userId));
        }

        // Check if user already exists
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);

        if (existingUser != null)
        {
            return existingUser;
        }

        // Create new user
        var newUser = new User
        {
            Id = userGuid,
            Email = email,
            Name = name ?? email.Split('@')[0], // Default name from email
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created new user in database: {UserId} ({Email})", userGuid, email);

        return newUser;
    }
}
