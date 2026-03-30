using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services;

public interface IInventoryService
{
    Task<ApiResponse<PagedResponse<ItemResponse>>> GetItemsAsync(
        Guid userId,
        Guid? householdId,
        string? locationIdRaw,
        string? category,
        string? status,
        string? destination,
        int page,
        int pageSize
    );

    Task<ApiResponse<List<LocationCountResponse>>> GetCountsByLocationAsync(
        Guid userId,
        Guid householdId
    );

    Task<ApiResponse<List<DestinationCountResponse>>> GetCountsByDestinationAsync(
        Guid userId,
        Guid householdId
    );

    Task<ApiResponse<PagedResponse<ItemResponse>>> SearchItemsAsync(
        Guid userId,
        Guid? householdId,
        string q,
        int page,
        int pageSize
    );

    Task<ApiResponse<ItemResponse>> GetItemAsync(Guid id, Guid userId);

    Task<ApiResponse<ItemResponse>> CreateItemAsync(CreateItemRequest request, Guid userId);

    Task<ApiResponse<bool>> UpdateItemAsync(Guid id, UpdateItemRequest request, Guid userId);

    Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId);

    Task<ApiResponse<ItemResponse>> ResolveItemAsync(
        Guid id,
        ResolveItemRequest request,
        Guid userId
    );

    Task<ApiResponse<ItemResponse>> RestoreItemAsync(Guid id, Guid userId);
}