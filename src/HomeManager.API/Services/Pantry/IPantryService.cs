using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services;

public interface IPantryService
{
    Task<ApiResponse<List<PantryItemResponse>>> GetItemsAsync(
        Guid householdId,
        Guid userId,
        Guid? locationId = null,
        string? category = null,
        string? status = null
    );

    Task<ApiResponse<PantryItemResponse>> GetItemAsync(Guid id, Guid userId);

    Task<ApiResponse<PantryItemResponse>> CreateItemAsync(
        CreatePantryItemRequest request,
        Guid userId
    );

    Task<ApiResponse<PantryItemResponse>> UpdateItemAsync(
        Guid id,
        UpdatePantryItemRequest request,
        Guid userId
    );

    Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId);
}
