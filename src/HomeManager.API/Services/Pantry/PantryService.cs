using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Inventory;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services;

public class PantryService : IPantryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PantryService> _logger;

    public PantryService(ApplicationDbContext context, ILogger<PantryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<List<PantryItemResponse>>> GetItemsAsync(
        Guid householdId,
        Guid userId,
        Guid? locationId = null,
        string? category = null,
        string? status = null
    )
    {
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == householdId && hu.UserId == userId
        );

        if (!hasAccess)
            return ApiResponse<List<PantryItemResponse>>.ErrorResponse(
                "Household not found or access denied"
            );

        var query = _context
            .PantryItems.Include(p => p.Location)
            .Include(p => p.Category)
            .Where(p => p.HouseholdId == householdId);

        if (locationId.HasValue)
            query = query.Where(p => p.LocationId == locationId.Value);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(p => p.Category != null && p.Category.Name == category);

        var items = await query.OrderBy(p => p.Name).ToListAsync();

        var responses = items.Select(ToResponse).ToList();

        // Apply status filter after projection (computed field)
        if (!string.IsNullOrEmpty(status))
            responses = responses.Where(r => r.Status == status).ToList();

        return ApiResponse<List<PantryItemResponse>>.SuccessResponse(
            responses,
            $"Found {responses.Count} pantry item(s)"
        );
    }

    public async Task<ApiResponse<PantryItemResponse>> GetItemAsync(Guid id, Guid userId)
    {
        var item = await _context
            .PantryItems.Include(p => p.Location)
            .Include(p => p.Category)
            .Include(p => p.Household)
            .FirstOrDefaultAsync(p =>
                p.Id == id && p.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (item == null)
            return ApiResponse<PantryItemResponse>.ErrorResponse(
                "Pantry item not found or access denied"
            );

        return ApiResponse<PantryItemResponse>.SuccessResponse(ToResponse(item));
    }

    public async Task<ApiResponse<PantryItemResponse>> CreateItemAsync(
        CreatePantryItemRequest request,
        Guid userId
    )
    {
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == request.HouseholdId && hu.UserId == userId
        );

        if (!hasAccess)
            return ApiResponse<PantryItemResponse>.ErrorResponse(
                "Household not found or access denied"
            );

        var item = new PantryItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = request.HouseholdId,
            Name = request.Name,
            Quantity = request.Quantity,
            Unit = request.Unit,
            MinQuantity = request.MinQuantity,
            ExpirationDate = request.ExpirationDate,
            LocationId = request.LocationId,
            CategoryId = request.CategoryId,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.PantryItems.Add(item);
        await _context.SaveChangesAsync();

        // Reload with navigations for the response
        await _context.Entry(item).Reference(p => p.Location).LoadAsync();
        await _context.Entry(item).Reference(p => p.Category).LoadAsync();

        _logger.LogInformation(
            "Created pantry item {ItemId} ({Name}) in household {HouseholdId}",
            item.Id,
            item.Name,
            item.HouseholdId
        );

        return ApiResponse<PantryItemResponse>.SuccessResponse(
            ToResponse(item),
            "Pantry item created successfully"
        );
    }

    public async Task<ApiResponse<PantryItemResponse>> UpdateItemAsync(
        Guid id,
        UpdatePantryItemRequest request,
        Guid userId
    )
    {
        var item = await _context
            .PantryItems.Include(p => p.Location)
            .Include(p => p.Category)
            .Include(p => p.Household)
            .FirstOrDefaultAsync(p =>
                p.Id == id && p.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (item == null)
            return ApiResponse<PantryItemResponse>.ErrorResponse(
                "Pantry item not found or access denied"
            );

        item.Name = request.Name ?? item.Name;
        item.Quantity = request.Quantity ?? item.Quantity;
        item.Unit = request.Unit ?? item.Unit;
        item.MinQuantity = request.MinQuantity ?? item.MinQuantity;
        item.ExpirationDate = request.ExpirationDate ?? item.ExpirationDate;
        item.LocationId = request.LocationId ?? item.LocationId;
        item.CategoryId = request.CategoryId ?? item.CategoryId;
        item.Notes = request.Notes ?? item.Notes;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Reload navigations in case LocationId/CategoryId changed
        await _context.Entry(item).Reference(p => p.Location).LoadAsync();
        await _context.Entry(item).Reference(p => p.Category).LoadAsync();

        _logger.LogInformation("Updated pantry item {ItemId}", id);

        return ApiResponse<PantryItemResponse>.SuccessResponse(
            ToResponse(item),
            "Pantry item updated successfully"
        );
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId)
    {
        var item = await _context
            .PantryItems.Include(p => p.Household)
            .FirstOrDefaultAsync(p =>
                p.Id == id && p.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (item == null)
            return ApiResponse<bool>.ErrorResponse("Pantry item not found or access denied");

        _context.PantryItems.Remove(item);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted pantry item {ItemId}", id);

        return ApiResponse<bool>.SuccessResponse(true, "Pantry item deleted successfully");
    }

    private static PantryItemResponse ToResponse(PantryItem item)
    {
        var status =
            item.MinQuantity.HasValue && item.Quantity <= item.MinQuantity.Value ? "low" : "ok";

        return new PantryItemResponse(
            item.Id,
            item.HouseholdId,
            item.Name,
            item.Quantity,
            item.Unit,
            item.MinQuantity,
            item.ExpirationDate,
            item.LocationId,
            item.Location?.Name,
            item.CategoryId,
            item.Category?.Name,
            item.Notes,
            status,
            item.CreatedAt,
            item.UpdatedAt
        );
    }
}
