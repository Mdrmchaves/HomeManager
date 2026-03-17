using System.Security.Claims;
using HomeManager.API.Services;
using Microsoft.Extensions.Caching.Memory;

namespace HomeManager.API.Middleware;

public class UserSyncMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<UserSyncMiddleware> _logger;
    private readonly IMemoryCache _cache;

    public UserSyncMiddleware(RequestDelegate next, ILogger<UserSyncMiddleware> logger, IMemoryCache cache)
    {
        _next = next;
        _logger = logger;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context, IServiceScopeFactory scopeFactory)
    {
        // Only sync if user is authenticated
        if (context.User.Identity?.IsAuthenticated == true)
        {
            _logger.LogInformation("User is authenticated, attempting sync...");

            try
            {
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
                    var cacheKey = $"user-synced:{userId}";

                    if (_cache.TryGetValue(cacheKey, out _))
                    {
                        _logger.LogInformation("User sync skipped (cached)");
                    }
                    else
                    {
                        // Use a dedicated scope so the sync DbContext/connection is isolated
                        // from the request-scoped DbContext used by controllers/services.
                        using var scope = scopeFactory.CreateScope();
                        var userSyncService = scope.ServiceProvider.GetRequiredService<IUserSyncService>();
                        await userSyncService.EnsureUserExistsAsync(userId, email, name);
                        _logger.LogInformation("User sync completed successfully");

                        _cache.Set(cacheKey, true, new MemoryCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                        });
                    }
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

        await _next(context);
    }
}
