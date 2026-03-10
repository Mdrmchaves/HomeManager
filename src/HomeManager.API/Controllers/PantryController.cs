using System.Security.Claims;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/pantry")]
[Authorize]
public class PantryController : ControllerBase
{
    private readonly IPantryService _pantryService;

    public PantryController(IPantryService pantryService)
    {
        _pantryService = pantryService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/pantry/items?householdId={guid}&locationId={guid}&category={string}&status=low
    [HttpGet("items")]
    public async Task<ActionResult<ApiResponse<List<PantryItemResponse>>>> GetItems(
        [FromQuery] Guid householdId,
        [FromQuery] Guid? locationId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null
    )
    {
        var response = await _pantryService.GetItemsAsync(
            householdId,
            GetUserId(),
            locationId,
            category,
            status
        );

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // GET: api/pantry/items/{id}
    [HttpGet("items/{id}")]
    public async Task<ActionResult<ApiResponse<PantryItemResponse>>> GetItem(Guid id)
    {
        var response = await _pantryService.GetItemAsync(id, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // POST: api/pantry/items
    [HttpPost("items")]
    public async Task<ActionResult<ApiResponse<PantryItemResponse>>> CreateItem(
        CreatePantryItemRequest request
    )
    {
        var response = await _pantryService.CreateItemAsync(request, GetUserId());

        if (!response.Success)
            return BadRequest(response);

        return CreatedAtAction(nameof(GetItem), new { id = response.Data!.Id }, response);
    }

    // PUT: api/pantry/items/{id}
    [HttpPut("items/{id}")]
    public async Task<ActionResult<ApiResponse<PantryItemResponse>>> UpdateItem(
        Guid id,
        UpdatePantryItemRequest request
    )
    {
        var response = await _pantryService.UpdateItemAsync(id, request, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // DELETE: api/pantry/items/{id}
    [HttpDelete("items/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid id)
    {
        var response = await _pantryService.DeleteItemAsync(id, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }
}
