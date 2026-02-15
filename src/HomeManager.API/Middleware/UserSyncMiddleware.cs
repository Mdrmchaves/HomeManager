using System.Security.Claims;
using HomeManager.API.Services;

namespace HomeManager.API.Middleware;

public class UserSyncMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<UserSyncMiddleware> _logger;

    public UserSyncMiddleware(RequestDelegate next, ILogger<UserSyncMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IUserSyncService userSyncService)
    {
        // Only sync if user is authenticated
        if (context.User.Identity?.IsAuthenticated == true)
        {
            _logger.LogInformation("User is authenticated, attempting sync...");

            try
            {
                // Extract user info from JWT claims
                var userId =
                    context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;

                var email =
                    context.User.FindFirst(ClaimTypes.Email)?.Value
                    ?? context.User.FindFirst("email")?.Value;

                var name =
                    context.User.FindFirst(ClaimTypes.Name)?.Value
                    ?? context.User.FindFirst("name")?.Value;

                _logger.LogInformation(
                    "Extracted claims - UserId: {UserId}, Email: {Email}, Name: {Name}",
                    userId,
                    email,
                    name
                );

                if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(email))
                {
                    // Ensure user exists in our database
                    await userSyncService.EnsureUserExistsAsync(userId, email, name);
                    _logger.LogInformation("User sync completed successfully");
                }
                else
                {
                    _logger.LogWarning("Missing required claims - UserId or Email is null");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing user to database");
                // Don't block the request if sync fails
            }
        }
        else
        {
            _logger.LogInformation("User is NOT authenticated, skipping sync");
        }

        await _next(context);
    }
}
