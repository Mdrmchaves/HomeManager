using System.Security.Claims;
using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HouseholdController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public HouseholdController(ApplicationDbContext context)
    {
        _context = context;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/household
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Household>>>> GetMyHouseholds()
    {
        var userId = GetUserId();

        var households = await _context
            .Households.Include(h => h.HouseholdUsers)
                .ThenInclude(hu => hu.User)
            .Where(h => h.HouseholdUsers.Any(hu => hu.UserId == userId))
            .ToListAsync();

        return Ok(
            ApiResponse<List<Household>>.SuccessResponse(
                households,
                $"Found {households.Count} household(s)"
            )
        );
    }

    // GET: api/household/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Household>>> GetHousehold(Guid id)
    {
        var userId = GetUserId();

        var household = await _context
            .Households.Include(h => h.HouseholdUsers)
                .ThenInclude(hu => hu.User)
            .FirstOrDefaultAsync(h =>
                h.Id == id && h.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (household == null)
            return NotFound(ApiResponse<Household>.ErrorResponse("Household not found"));

        return Ok(ApiResponse<Household>.SuccessResponse(household));
    }

    // POST: api/household
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Household>>> CreateHousehold(
        CreateHouseholdRequest request
    )
    {
        var userId = GetUserId();

        var inviteCode = GenerateInviteCode();

        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            InviteCode = inviteCode,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Households.Add(household);

        var householdUser = new HouseholdUser
        {
            UserId = userId,
            HouseholdId = household.Id,
            Role = "owner",
            JoinedAt = DateTime.UtcNow,
        };

        _context.HouseholdUsers.Add(householdUser);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetHousehold),
            new { id = household.Id },
            ApiResponse<Household>.SuccessResponse(household, "Household created successfully")
        );
    }

    // POST: api/household/join/{inviteCode}
    [HttpPost("join/{inviteCode}")]
    public async Task<ActionResult<ApiResponse<Household>>> JoinHousehold(string inviteCode)
    {
        var userId = GetUserId();

        var household = await _context.Households.FirstOrDefaultAsync(h =>
            h.InviteCode == inviteCode
        );

        if (household == null)
            return NotFound(ApiResponse<Household>.ErrorResponse("Invalid invite code"));

        var alreadyMember = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == household.Id && hu.UserId == userId
        );

        if (alreadyMember)
            return BadRequest(
                ApiResponse<Household>.ErrorResponse("You are already a member of this household")
            );

        var householdUser = new HouseholdUser
        {
            UserId = userId,
            HouseholdId = household.Id,
            Role = "member",
            JoinedAt = DateTime.UtcNow,
        };

        _context.HouseholdUsers.Add(householdUser);
        await _context.SaveChangesAsync();

        return Ok(
            ApiResponse<Household>.SuccessResponse(household, "Successfully joined household")
        );
    }

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(
            Enumerable.Repeat(chars, 8).Select(s => s[random.Next(s.Length)]).ToArray()
        );
    }
}

public record CreateHouseholdRequest(string Name);
