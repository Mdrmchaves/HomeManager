using System.Security.Claims;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoryController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/households/{householdId}/categories?type=pertences
    [HttpGet("households/{householdId}/categories")]
    public async Task<ActionResult<ApiResponse<List<CategoryResponse>>>> GetCategories(
        Guid householdId,
        [FromQuery] string? type = null
    )
    {
        var response = await _categoryService.GetCategoriesAsync(householdId, GetUserId(), type);

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // POST: api/households/{householdId}/categories
    [HttpPost("households/{householdId}/categories")]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> CreateCategory(
        Guid householdId,
        CreateCategoryRequest request
    )
    {
        var response = await _categoryService.CreateCategoryAsync(householdId, request, GetUserId());

        if (!response.Success)
            return BadRequest(response);

        return CreatedAtAction(
            nameof(GetCategories),
            new { householdId },
            response
        );
    }

    // PUT: api/categories/{id}
    [HttpPut("categories/{id}")]
    public async Task<ActionResult<ApiResponse<CategoryResponse>>> UpdateCategory(
        Guid id,
        UpdateCategoryRequest request
    )
    {
        var response = await _categoryService.UpdateCategoryAsync(id, request, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // DELETE: api/categories/{id}
    [HttpDelete("categories/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCategory(Guid id)
    {
        var response = await _categoryService.DeleteCategoryAsync(id, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }
}
