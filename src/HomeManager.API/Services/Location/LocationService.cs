using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Inventory;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services;

public class LocationService : ILocationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LocationService> _logger;

    public LocationService(ApplicationDbContext context, ILogger<LocationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<List<LocationResponse>>> GetLocationsAsync(
        Guid householdId,
        Guid userId
    )
    {
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == householdId && hu.UserId == userId
        );

        if (!hasAccess)
            return ApiResponse<List<LocationResponse>>.ErrorResponse(
                "Household not found or access denied"
            );

        var locations = await _context
            .Locations.Where(l => l.HouseholdId == householdId)
            .OrderBy(l => l.Name)
            .Select(l => new LocationResponse(l.Id, l.HouseholdId, l.Name, l.Icon, l.CreatedAt))
            .ToListAsync();

        return ApiResponse<List<LocationResponse>>.SuccessResponse(
            locations,
            $"Found {locations.Count} location(s)"
        );
    }

    public async Task<ApiResponse<LocationResponse>> CreateLocationAsync(
        Guid householdId,
        CreateLocationRequest request,
        Guid userId
    )
    {
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == householdId && hu.UserId == userId
        );

        if (!hasAccess)
            return ApiResponse<LocationResponse>.ErrorResponse(
                "Household not found or access denied"
            );

        var location = new Location
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = request.Name,
            Icon = request.Icon,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Locations.Add(location);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created location {LocationId} ({Name}) in household {HouseholdId}",
            location.Id,
            location.Name,
            householdId
        );

        var response = new LocationResponse(
            location.Id,
            location.HouseholdId,
            location.Name,
            location.Icon,
            location.CreatedAt
        );

        return ApiResponse<LocationResponse>.SuccessResponse(response, "Location created successfully");
    }

    public async Task<ApiResponse<LocationResponse>> UpdateLocationAsync(
        Guid id,
        UpdateLocationRequest request,
        Guid userId
    )
    {
        var location = await _context
            .Locations.Include(l => l.Household)
            .FirstOrDefaultAsync(l =>
                l.Id == id && l.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (location == null)
            return ApiResponse<LocationResponse>.ErrorResponse("Location not found or access denied");

        location.Name = request.Name ?? location.Name;
        location.Icon = request.Icon ?? location.Icon;
        location.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated location {LocationId}", id);

        var response = new LocationResponse(
            location.Id,
            location.HouseholdId,
            location.Name,
            location.Icon,
            location.CreatedAt
        );

        return ApiResponse<LocationResponse>.SuccessResponse(response, "Location updated successfully");
    }

    public async Task<ApiResponse<bool>> DeleteLocationAsync(Guid id, Guid userId)
    {
        var location = await _context
            .Locations.Include(l => l.Household)
            .FirstOrDefaultAsync(l =>
                l.Id == id && l.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (location == null)
            return ApiResponse<bool>.ErrorResponse("Location not found or access denied");

        _context.Locations.Remove(location);
        await _context.SaveChangesAsync();

        // Note: When Part 3 adds InventoryItem.LocationId FK with ON DELETE SET NULL,
        // associated items will automatically have their locationId cleared by the DB.

        _logger.LogInformation("Deleted location {LocationId}", id);

        return ApiResponse<bool>.SuccessResponse(true, "Location deleted successfully");
    }
}
