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
        _logger.LogInformation(
            "Fetching locations for household {HouseholdId} and user {UserId}",
            householdId,
            userId
        );

        try
        {
            var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == householdId && hu.UserId == userId
            );

            if (!hasAccess)
            {
                _logger.LogError(
                    "Household {HouseholdId} not found or access denied to user {UserId}",
                    householdId,
                    userId
                );
                return ApiResponse<List<LocationResponse>>.ErrorResponse(
                    "Household not found or access denied"
                );
            }

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
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error fetching locations for household {HouseholdId}",
                householdId
            );
            return ApiResponse<List<LocationResponse>>.ErrorResponse(
                "An error occurred while fetching locations"
            );
        }
    }

    public async Task<ApiResponse<LocationResponse>> CreateLocationAsync(
        Guid householdId,
        CreateLocationRequest request,
        Guid userId
    )
    {
        _logger.LogInformation(
            "Creating location for household {HouseholdId} and user {UserId}",
            householdId,
            userId
        );
        try
        {
            var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == householdId && hu.UserId == userId
            );

            if (!hasAccess)
            {
                _logger.LogError(
                    "Household {HouseholdId} not found or access denied to user {UserId}",
                    householdId,
                    userId
                );
                return ApiResponse<LocationResponse>.ErrorResponse(
                    "Household not found or access denied"
                );
            }

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

            _logger.LogInformation(
                "Location {LocationId} ({Name}) created successfully in household {HouseholdId}",
                location.Id,
                location.Name,
                householdId
            );
            return ApiResponse<LocationResponse>.SuccessResponse(
                response,
                "Location created successfully"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error creating location for household {HouseholdId}",
                householdId
            );
            return ApiResponse<LocationResponse>.ErrorResponse(
                "An error occurred while creating the location"
            );
        }
    }

    public async Task<ApiResponse<LocationResponse>> UpdateLocationAsync(
        Guid LocationId,
        UpdateLocationRequest request,
        Guid userId
    )
    {
        _logger.LogInformation(
            "Updating location for household {LocationId} and user {UserId}",
            LocationId,
            userId
        );
        try
        {
            var location = await _context
                .Locations.Include(l => l.Household)
                .FirstOrDefaultAsync(l =>
                    l.Id == LocationId && l.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (location == null)
            {
                _logger.LogError(
                    "Location {LocationId} not found or access denied to user {UserId}",
                    LocationId,
                    userId
                );
                return ApiResponse<LocationResponse>.ErrorResponse(
                    "Location not found or access denied"
                );
            }

            location.Name = request.Name ?? location.Name;
            location.Icon = request.Icon ?? location.Icon;
            location.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated location {LocationId}", LocationId);

            var response = new LocationResponse(
                location.Id,
                location.HouseholdId,
                location.Name,
                location.Icon,
                location.CreatedAt
            );

            return ApiResponse<LocationResponse>.SuccessResponse(
                response,
                "Location updated successfully"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating location {LocationId}", LocationId);
            return ApiResponse<LocationResponse>.ErrorResponse(
                "An error occurred while updating the location"
            );
        }
    }

    public async Task<ApiResponse<bool>> DeleteLocationAsync(Guid LocationId, Guid userId)
    {
        _logger.LogInformation("Start to delete location {LocationId}", LocationId);
        try
        {
            var location = await _context
                .Locations.Include(l => l.Household)
                .FirstOrDefaultAsync(l =>
                    l.Id == LocationId && l.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (location == null)
            {
                _logger.LogError(
                    "Location {LocationId} not found or access denied to user {UserId}",
                    LocationId,
                    userId
                );
                return ApiResponse<bool>.ErrorResponse("Location not found or access denied");
            }

            _context.Locations.Remove(location);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted location {LocationId}", LocationId);

            return ApiResponse<bool>.SuccessResponse(true, "Location deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting location {LocationId}", LocationId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while deleting the location");
        }
    }
}
