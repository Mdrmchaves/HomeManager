using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Inventory;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services;

public class InventoryService : IInventoryService
{
    private readonly ILogger<InventoryService> _logger;
    private readonly ApplicationDbContext _context;

    public InventoryService(ILogger<InventoryService> logger, ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task<ApiResponse<PagedResponse<ItemResponse>>> GetItemsAsync(
        Guid userId,
        Guid? householdId,
        string? locationIdRaw,
        string? category,
        string? status,
        string? destination,
        int page,
        int pageSize
    )
    {
        _logger.LogInformation("Fetching items for user {UserId}", userId);
        try
        {
            var statusFilter = string.IsNullOrEmpty(status) ? "active" : status;

            bool filterByNullLocation = locationIdRaw == "null";
            Guid? locationId = null;
            if (!filterByNullLocation && Guid.TryParse(locationIdRaw, out var parsedLocationId))
                locationId = parsedLocationId;

            var query = _context
                .InventoryItems.Include(i => i.LocationRef)
                .Include(i => i.Category)
                .Where(i => i.Household.HouseholdUsers.Any(hu => hu.UserId == userId))
                .Where(i => i.Status == statusFilter);

            if (householdId.HasValue)
                query = query.Where(i => i.HouseholdId == householdId.Value);

            if (filterByNullLocation)
                query = query.Where(i => i.LocationId == null);
            else if (locationId.HasValue)
                query = query.Where(i => i.LocationId == locationId.Value);

            if (!string.IsNullOrEmpty(category))
                query = query.Where(i => i.Category != null && i.Category.Name == category);

            if (!string.IsNullOrEmpty(destination))
            {
                if (destination == "null")
                    query = query.Where(i => i.Destination == null);
                else
                    query = query.Where(i => i.Destination == destination);
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(i => i.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var paged = new PagedResponse<ItemResponse>
            {
                Items = items.Select(ItemResponse.FromEntity).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize,
                HasMore = (page * pageSize) < total,
            };

            _logger.LogInformation(
                "Fetched {Count}/{Total} items (page {Page}) for user {UserId}",
                items.Count,
                total,
                page,
                userId
            );
            return ApiResponse<PagedResponse<ItemResponse>>.SuccessResponse(paged);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching items for user {UserId}", userId);
            return ApiResponse<PagedResponse<ItemResponse>>.ErrorResponse(
                $"Error fetching items: {ex.Message}"
            );
        }
    }

    public async Task<ApiResponse<List<LocationCountResponse>>> GetCountsByLocationAsync(
        Guid userId,
        Guid householdId
    )
    {
        _logger.LogInformation(
            "Fetching location counts for household {HouseholdId} by user {UserId}",
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
                _logger.LogWarning(
                    "Access denied: user {UserId} requested counts for household {HouseholdId}",
                    userId,
                    householdId
                );
                return ApiResponse<List<LocationCountResponse>>.ErrorResponse("Access denied");
            }

            var groups = await _context
                .InventoryItems.Where(i =>
                    i.HouseholdId == householdId && i.Status == "active"
                )
                .GroupBy(i => i.LocationId)
                .Select(g => new { LocationId = g.Key, Count = g.Count() })
                .ToListAsync();

            var locationIds = groups
                .Where(g => g.LocationId.HasValue)
                .Select(g => g.LocationId!.Value)
                .ToList();

            var locationMap = await _context
                .Locations.Where(l => locationIds.Contains(l.Id))
                .ToDictionaryAsync(l => l.Id);

            var result = groups
                .Select(g => new LocationCountResponse
                {
                    LocationId = g.LocationId,
                    LocationName =
                        g.LocationId.HasValue
                        && locationMap.TryGetValue(g.LocationId.Value, out var loc)
                            ? loc.Name
                            : "Sem localização",
                    Icon =
                        g.LocationId.HasValue
                        && locationMap.TryGetValue(g.LocationId.Value, out var locIcon)
                            ? locIcon.Icon
                            : null,
                    Count = g.Count,
                })
                .OrderBy(r => r.LocationId == null ? 1 : 0)
                .ThenByDescending(r => r.Count)
                .ToList();

            _logger.LogInformation(
                "Fetched {Count} location groups for household {HouseholdId}",
                result.Count,
                householdId
            );
            return ApiResponse<List<LocationCountResponse>>.SuccessResponse(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error fetching location counts for household {HouseholdId}",
                householdId
            );
            return ApiResponse<List<LocationCountResponse>>.ErrorResponse(
                $"Error fetching location counts: {ex.Message}"
            );
        }
    }

    public async Task<ApiResponse<List<DestinationCountResponse>>> GetCountsByDestinationAsync(
        Guid userId,
        Guid householdId
    )
    {
        _logger.LogInformation(
            "Fetching destination counts for household {HouseholdId} by user {UserId}",
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
                _logger.LogWarning(
                    "Access denied: user {UserId} requested destination counts for household {HouseholdId}",
                    userId,
                    householdId
                );
                return ApiResponse<List<DestinationCountResponse>>.ErrorResponse("Access denied");
            }

            var groups = await _context
                .InventoryItems.Where(i =>
                    i.HouseholdId == householdId && i.Status == "active"
                )
                .GroupBy(i => i.Destination)
                .Select(g => new DestinationCountResponse
                {
                    Destination = g.Key,
                    Count = g.Count(),
                })
                .ToListAsync();

            var knownOrder = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["keep"] = 0,
                ["sell"] = 1,
                ["donate"] = 2,
                ["discard"] = 3,
            };

            var result = groups
                .OrderBy(r =>
                    r.Destination == null ? int.MaxValue
                    : knownOrder.TryGetValue(r.Destination, out var order) ? order
                    : int.MaxValue - 1
                )
                .ToList();

            _logger.LogInformation(
                "Fetched {Count} destination groups for household {HouseholdId}",
                result.Count,
                householdId
            );
            return ApiResponse<List<DestinationCountResponse>>.SuccessResponse(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error fetching destination counts for household {HouseholdId}",
                householdId
            );
            return ApiResponse<List<DestinationCountResponse>>.ErrorResponse(
                $"Error fetching destination counts: {ex.Message}"
            );
        }
    }

    public async Task<ApiResponse<PagedResponse<ItemResponse>>> SearchItemsAsync(
        Guid userId,
        Guid? householdId,
        string q,
        int page,
        int pageSize
    )
    {
        _logger.LogInformation(
            "Searching items with query '{Query}' for user {UserId}",
            q,
            userId
        );
        try
        {
            if (string.IsNullOrEmpty(q) || q.Trim().Length < 2)
                return ApiResponse<PagedResponse<ItemResponse>>.ErrorResponse(
                    "O termo de pesquisa deve ter pelo menos 2 caracteres."
                );

            var query = _context
                .InventoryItems.Include(i => i.LocationRef)
                .Include(i => i.Category)
                .Where(i => i.Household.HouseholdUsers.Any(hu => hu.UserId == userId))
                .Where(i => i.Status == "active")
                .Where(i => EF.Functions.ILike(i.Name, $"%{q.Trim()}%"));

            if (householdId.HasValue)
                query = query.Where(i => i.HouseholdId == householdId.Value);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(i => i.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var paged = new PagedResponse<ItemResponse>
            {
                Items = items.Select(ItemResponse.FromEntity).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize,
                HasMore = (page * pageSize) < total,
            };

            _logger.LogInformation(
                "Search '{Query}' returned {Count}/{Total} items for user {UserId}",
                q,
                items.Count,
                total,
                userId
            );
            return ApiResponse<PagedResponse<ItemResponse>>.SuccessResponse(paged);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching items for user {UserId}", userId);
            return ApiResponse<PagedResponse<ItemResponse>>.ErrorResponse(
                $"Error searching items: {ex.Message}"
            );
        }
    }

    public async Task<ApiResponse<ItemResponse>> GetItemAsync(Guid id, Guid userId)
    {
        _logger.LogInformation("Fetching item {ItemId} for user {UserId}", id, userId);
        try
        {
            var item = await _context
                .InventoryItems.Include(i => i.LocationRef)
                .Include(i => i.Category)
                .Include(i => i.Household)
                .FirstOrDefaultAsync(i =>
                    i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (item == null)
            {
                _logger.LogWarning(
                    "Item {ItemId} not found for user {UserId}",
                    id,
                    userId
                );
                return ApiResponse<ItemResponse>.ErrorResponse("Not found");
            }

            return ApiResponse<ItemResponse>.SuccessResponse(ItemResponse.FromEntity(item));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching item {ItemId} for user {UserId}", id, userId);
            return ApiResponse<ItemResponse>.ErrorResponse($"Error fetching item: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ItemResponse>> CreateItemAsync(
        CreateItemRequest request,
        Guid userId
    )
    {
        _logger.LogInformation(
            "Creating item in household {HouseholdId} for user {UserId}",
            request.HouseholdId,
            userId
        );
        try
        {
            var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == request.HouseholdId && hu.UserId == userId
            );
            if (!hasAccess)
            {
                _logger.LogWarning(
                    "Access denied: user {UserId} attempted to create item in household {HouseholdId}",
                    userId,
                    request.HouseholdId
                );
                return ApiResponse<ItemResponse>.ErrorResponse("Access denied");
            }

            var item = new InventoryItem
            {
                Id = Guid.NewGuid(),
                HouseholdId = request.HouseholdId,
                Name = request.Name,
                Description = request.Description,
                Value = request.Value,
                PhotoUrl = request.PhotoUrl,
                Destination = request.Destination,
                OwnerId = request.OwnerId,
                Tags = request.Tags,
                ListId = request.ListId,
                LocationId = request.LocationId,
                CategoryId = request.CategoryId,
                Quantity = request.Quantity,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();

            await _context.Entry(item).Reference(i => i.LocationRef).LoadAsync();
            await _context.Entry(item).Reference(i => i.Category).LoadAsync();

            _logger.LogInformation(
                "Item {ItemId} created in household {HouseholdId} by user {UserId}",
                item.Id,
                item.HouseholdId,
                userId
            );
            return ApiResponse<ItemResponse>.SuccessResponse(
                ItemResponse.FromEntity(item),
                "Item created successfully"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error creating item in household {HouseholdId} for user {UserId}",
                request.HouseholdId,
                userId
            );
            return ApiResponse<ItemResponse>.ErrorResponse($"Error creating item: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> UpdateItemAsync(
        Guid id,
        UpdateItemRequest request,
        Guid userId
    )
    {
        _logger.LogInformation("Updating item {ItemId} by user {UserId}", id, userId);
        try
        {
            var item = await _context
                .InventoryItems.Include(i => i.Household)
                .FirstOrDefaultAsync(i =>
                    i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (item == null)
            {
                _logger.LogWarning("Item {ItemId} not found for user {UserId}", id, userId);
                return ApiResponse<bool>.ErrorResponse("Not found");
            }

            item.Name = request.Name ?? item.Name;
            item.Description = request.Description ?? item.Description;
            item.Value = request.Value ?? item.Value;
            item.PhotoUrl = request.PhotoUrl ?? item.PhotoUrl;
            item.Destination = request.Destination ?? item.Destination;
            item.OwnerId = request.OwnerId ?? item.OwnerId;
            item.Tags = request.Tags ?? item.Tags;
            item.ListId = request.ListId ?? item.ListId;
            item.LocationId = request.LocationId ?? item.LocationId;
            item.CategoryId = request.CategoryId ?? item.CategoryId;
            item.Quantity = request.Quantity ?? item.Quantity;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Item {ItemId} updated successfully by user {UserId}", id, userId);
            return ApiResponse<bool>.SuccessResponse(true, "Item updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {ItemId} for user {UserId}", id, userId);
            return ApiResponse<bool>.ErrorResponse($"Error updating item: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId)
    {
        _logger.LogInformation("Deleting item {ItemId} by user {UserId}", id, userId);
        try
        {
            var item = await _context
                .InventoryItems.Include(i => i.Household)
                .FirstOrDefaultAsync(i =>
                    i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (item == null)
            {
                _logger.LogWarning("Item {ItemId} not found for user {UserId}", id, userId);
                return ApiResponse<bool>.ErrorResponse("Not found");
            }

            _context.InventoryItems.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Item {ItemId} deleted successfully by user {UserId}", id, userId);
            return ApiResponse<bool>.SuccessResponse(true, "Item deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting item {ItemId} for user {UserId}", id, userId);
            return ApiResponse<bool>.ErrorResponse($"Error deleting item: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ItemResponse>> ResolveItemAsync(
        Guid id,
        ResolveItemRequest request,
        Guid userId
    )
    {
        _logger.LogInformation(
            "Resolving item {ItemId} with destination {Destination} by user {UserId}",
            id,
            request.Destination,
            userId
        );
        try
        {
            var item = await _context
                .InventoryItems.Include(i => i.Household)
                .Include(i => i.LocationRef)
                .Include(i => i.Category)
                .FirstOrDefaultAsync(i =>
                    i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (item == null)
            {
                _logger.LogWarning("Item {ItemId} not found for user {UserId}", id, userId);
                return ApiResponse<ItemResponse>.ErrorResponse("Not found");
            }

            item.Status = "resolved";
            item.ResolvedAt = DateTime.UtcNow;
            item.Destination = request.Destination;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Item {ItemId} resolved successfully by user {UserId} with destination {Destination}",
                id,
                userId,
                request.Destination
            );
            return ApiResponse<ItemResponse>.SuccessResponse(ItemResponse.FromEntity(item));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving item {ItemId} for user {UserId}", id, userId);
            return ApiResponse<ItemResponse>.ErrorResponse($"Error resolving item: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ItemResponse>> RestoreItemAsync(Guid id, Guid userId)
    {
        _logger.LogInformation("Restoring item {ItemId} by user {UserId}", id, userId);
        try
        {
            var item = await _context
                .InventoryItems.Include(i => i.Household)
                .Include(i => i.LocationRef)
                .Include(i => i.Category)
                .FirstOrDefaultAsync(i =>
                    i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (item == null)
            {
                _logger.LogWarning("Item {ItemId} not found for user {UserId}", id, userId);
                return ApiResponse<ItemResponse>.ErrorResponse("Not found");
            }

            item.Status = "active";
            item.ResolvedAt = null;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Item {ItemId} restored to active successfully by user {UserId}",
                id,
                userId
            );
            return ApiResponse<ItemResponse>.SuccessResponse(ItemResponse.FromEntity(item));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring item {ItemId} for user {UserId}", id, userId);
            return ApiResponse<ItemResponse>.ErrorResponse($"Error restoring item: {ex.Message}");
        }
    }
}