using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Shared;

namespace HomeManager.API.Services;

public interface IHouseholdService
{
    Task<ApiResponse<List<Household>>> GetMyHouseholds(Guid id, Guid userId);
    
    Task<ApiResponse<Household>> GetHouseholdAsync(Guid id, Guid userId);

    Task<ApiResponse<Household>> CreateHouseholdAsync(CreateHouseholdRequest request, Guid userId);

    Task<ApiResponse<Household>> JoinHouseholdAsync(string inviteCode, Guid userId);
}
