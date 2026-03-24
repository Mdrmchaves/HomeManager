using System.Security.Claims;
using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UsersController> _logger;

    public UsersController(ApplicationDbContext context, ILogger<UsersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/users/me
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetMe()
    {
        var userId = GetUserId();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        return Ok(ApiResponse<UserResponse>.SuccessResponse(UserResponse.FromEntity(user)));
    }

    // PUT: api/users/me
    [HttpPut("me")]
    public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateMe(UpdateUserRequest request)
    {
        var userId = GetUserId();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        user.Name = request.Name;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("User {UserId} updated name", userId);

        return Ok(ApiResponse<UserResponse>.SuccessResponse(UserResponse.FromEntity(user)));
    }
}
