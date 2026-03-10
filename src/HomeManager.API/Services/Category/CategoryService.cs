using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Inventory;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(ApplicationDbContext context, ILogger<CategoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<List<CategoryResponse>>> GetCategoriesAsync(
        Guid householdId,
        Guid userId,
        string? type = null
    )
    {
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == householdId && hu.UserId == userId
        );

        if (!hasAccess)
            return ApiResponse<List<CategoryResponse>>.ErrorResponse(
                "Household not found or access denied"
            );

        var query = _context.Categories.Where(c => c.HouseholdId == householdId);

        if (!string.IsNullOrEmpty(type))
            query = query.Where(c => c.Type == type);

        var categories = await query
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id, c.HouseholdId, c.Name, c.Type, c.CreatedAt))
            .ToListAsync();

        return ApiResponse<List<CategoryResponse>>.SuccessResponse(
            categories,
            $"Found {categories.Count} category(ies)"
        );
    }

    public async Task<ApiResponse<CategoryResponse>> CreateCategoryAsync(
        Guid householdId,
        CreateCategoryRequest request,
        Guid userId
    )
    {
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == householdId && hu.UserId == userId
        );

        if (!hasAccess)
            return ApiResponse<CategoryResponse>.ErrorResponse(
                "Household not found or access denied"
            );

        var category = new Category
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = request.Name,
            Type = request.Type,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created category {CategoryId} ({Name}, {Type}) in household {HouseholdId}",
            category.Id,
            category.Name,
            category.Type,
            householdId
        );

        var response = new CategoryResponse(
            category.Id,
            category.HouseholdId,
            category.Name,
            category.Type,
            category.CreatedAt
        );

        return ApiResponse<CategoryResponse>.SuccessResponse(response, "Category created successfully");
    }

    public async Task<ApiResponse<CategoryResponse>> UpdateCategoryAsync(
        Guid id,
        UpdateCategoryRequest request,
        Guid userId
    )
    {
        var category = await _context
            .Categories.Include(c => c.Household)
            .FirstOrDefaultAsync(c =>
                c.Id == id && c.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (category == null)
            return ApiResponse<CategoryResponse>.ErrorResponse(
                "Category not found or access denied"
            );

        category.Name = request.Name ?? category.Name;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated category {CategoryId}", id);

        var response = new CategoryResponse(
            category.Id,
            category.HouseholdId,
            category.Name,
            category.Type,
            category.CreatedAt
        );

        return ApiResponse<CategoryResponse>.SuccessResponse(response, "Category updated successfully");
    }

    public async Task<ApiResponse<bool>> DeleteCategoryAsync(Guid id, Guid userId)
    {
        var category = await _context
            .Categories.Include(c => c.Household)
            .FirstOrDefaultAsync(c =>
                c.Id == id && c.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (category == null)
            return ApiResponse<bool>.ErrorResponse("Category not found or access denied");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        // Associated items have their categoryId set to null via ON DELETE SET NULL FK constraint.

        _logger.LogInformation("Deleted category {CategoryId}", id);

        return ApiResponse<bool>.SuccessResponse(true, "Category deleted successfully");
    }
}
