using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services.Finance;

public interface IPlanningService
{
    Task<ApiResponse<List<PlanningItemResponse>>> GetItemsAsync(Guid householdId, Guid userId);
    Task<ApiResponse<PlanningItemResponse>> CreateItemAsync(CreatePlanningItemRequest request, Guid userId);
    Task<ApiResponse<PlanningItemResponse>> UpdateItemAsync(Guid id, UpdatePlanningItemRequest request, Guid userId);
    Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId);
}
