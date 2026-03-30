using System.Security.Claims;
using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Shared;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services;

public class HouseholdService : IHouseholdService
{
    private readonly ILogger<HouseholdService> _logger;
    private readonly ApplicationDbContext _context;

    public HouseholdService(ILogger<HouseholdService> logger, ApplicationDbContext dbContext)
    {
        _logger = logger;
        _context = dbContext;
    }

    public async Task<ApiResponse<List<Household>>> GetMyHouseholds(Guid id, Guid userId)
    {
        _logger.LogInformation("Fetching households for user {UserId}", userId);
        try
        {
            var households = await _context
                .Households.Include(h => h.HouseholdUsers)
                    .ThenInclude(hu => hu.User)
                .Where(h => h.HouseholdUsers.Any(hu => hu.UserId == userId))
                .ToListAsync();

            return ApiResponse<List<Household>>.SuccessResponse(
                households,
                $"Found {households.Count} household(s)"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching households for user {UserId}", userId);
            return ApiResponse<List<Household>>.ErrorResponse(
                $"Error fetching households: {ex.Message}"
            );
        }
    }

    public async Task<ApiResponse<Household>> GetHouseholdAsync(Guid id, Guid userId)
    {
        _logger.LogInformation("Fetching household {HouseholdId} for user {UserId}", id, userId);
        try
        {
            var household = await _context
                .Households.Include(h => h.HouseholdUsers)
                    .ThenInclude(hu => hu.User)
                .FirstOrDefaultAsync(h =>
                    h.Id == id && h.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (household == null)
                return ApiResponse<Household>.ErrorResponse("Household not found");

            return ApiResponse<Household>.SuccessResponse(household);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error fetching household {HouseholdId} for user {UserId}",
                id,
                userId
            );
            return ApiResponse<Household>.ErrorResponse($"Error fetching household: {ex.Message}");
        }
    }

    public async Task<ApiResponse<Household>> CreateHouseholdAsync(
        CreateHouseholdRequest request,
        Guid userId
    )
    {
        _logger.LogInformation("Creating household for user {UserId}", userId);
        try
        {
            var inviteCode = this.GenerateInviteCode(request.Name);

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

            _logger.LogInformation("Household created successfully: {HouseholdId}", household.Id);
            return ApiResponse<Household>.SuccessResponse(
                household,
                "Household created successfully"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating household.");
            return ApiResponse<Household>.ErrorResponse($"Error creating household: {ex.Message}");
        }
    }

    public async Task<ApiResponse<Household>> JoinHouseholdAsync(string inviteCode, Guid userId)
    {
        _logger.LogInformation("Joining household for user {UserId}", userId);
        try
        {
            var household = await _context.Households.FirstOrDefaultAsync(h =>
                h.InviteCode == inviteCode
            );

            if (household == null)
            {
                _logger.LogError(
                    "Invalid invite code {InviteCode} used by user {UserId}",
                    inviteCode,
                    userId
                );
                return ApiResponse<Household>.ErrorResponse("Invalid invite code");
            }

            var alreadyMember = await _context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == household.Id && hu.UserId == userId
            );

            if (alreadyMember)
            {
                _logger.LogWarning("User {UserId} is already a member of this household", userId);
                return ApiResponse<Household>.ErrorResponse(
                    "You are already a member of this household"
                );
            }

            var householdUser = new HouseholdUser
            {
                UserId = userId,
                HouseholdId = household.Id,
                Role = "member",
                JoinedAt = DateTime.UtcNow,
            };

            _context.HouseholdUsers.Add(householdUser);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "User {UserId} Successfully joined household {HouseholdId}",
                userId,
                household.Id
            );
            return ApiResponse<Household>.SuccessResponse(
                household,
                "Successfully joined household"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining household.");
            return ApiResponse<Household>.ErrorResponse($"Error joining household: {ex.Message}");
        }
    }

    private string GenerateInviteCode(string name)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        // Just 8 random alphanumeric characters
        return new string(
            Enumerable.Repeat(chars, 8).Select(s => s[random.Next(s.Length)]).ToArray()
        );
    }
}
