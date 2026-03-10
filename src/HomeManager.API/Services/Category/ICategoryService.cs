using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services;

public interface ICategoryService
{
    Task<ApiResponse<List<CategoryResponse>>> GetCategoriesAsync(
        Guid householdId,
        Guid userId,
        string? type = null
    );

    Task<ApiResponse<CategoryResponse>> CreateCategoryAsync(
        Guid householdId,
        CreateCategoryRequest request,
        Guid userId
    );

    Task<ApiResponse<CategoryResponse>> UpdateCategoryAsync(
        Guid id,
        UpdateCategoryRequest request,
        Guid userId
    );

    Task<ApiResponse<bool>> DeleteCategoryAsync(Guid id, Guid userId);
}
