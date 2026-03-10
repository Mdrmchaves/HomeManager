using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services;

public interface ILocationService
{
    Task<ApiResponse<List<LocationResponse>>> GetLocationsAsync(Guid householdId, Guid userId);

    Task<ApiResponse<LocationResponse>> CreateLocationAsync(
        Guid householdId,
        CreateLocationRequest request,
        Guid userId
    );

    Task<ApiResponse<LocationResponse>> UpdateLocationAsync(
        Guid id,
        UpdateLocationRequest request,
        Guid userId
    );

    Task<ApiResponse<bool>> DeleteLocationAsync(Guid id, Guid userId);
}
