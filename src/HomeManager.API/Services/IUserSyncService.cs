using HomeManager.API.Models.Shared;

namespace HomeManager.API.Services;

public interface IUserSyncService
{
    Task<User> EnsureUserExistsAsync(string userId, string email, string? name);
}
