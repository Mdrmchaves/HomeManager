using System.Security.Claims;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/inventory/items?householdId={guid}&locationId={guid|"null"}&category={string}&status={string}&destination={string}&page={int}&pageSize={int}
    [HttpGet("items")]
    public async Task<ActionResult<ApiResponse<PagedResponse<ItemResponse>>>> GetItems(
        [FromQuery] Guid? householdId = null,
        [FromQuery(Name = "locationId")] string? locationIdRaw = null,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null,
        [FromQuery] string? destination = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30
    )
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var result = await _inventoryService.GetItemsAsync(
            GetUserId(),
            householdId,
            locationIdRaw,
            category,
            status,
            destination,
            page,
            pageSize
        );

        if (!result.Success)
            return StatusCode(500, result);

        return Ok(result);
    }

    // GET: api/inventory/items/counts/by-location?householdId={guid}
    [HttpGet("items/counts/by-location")]
    public async Task<ActionResult<ApiResponse<List<LocationCountResponse>>>> GetCountsByLocation(
        [FromQuery] Guid householdId
    )
    {
        var result = await _inventoryService.GetCountsByLocationAsync(GetUserId(), householdId);

        if (!result.Success)
        {
            if (result.Message == "Access denied")
                return Forbid();
            return StatusCode(500, result);
        }

        return Ok(result);
    }

    // GET: api/inventory/items/counts/by-destination?householdId={guid}
    [HttpGet("items/counts/by-destination")]
    public async Task<
        ActionResult<ApiResponse<List<DestinationCountResponse>>>
    > GetCountsByDestination([FromQuery] Guid householdId)
    {
        var result = await _inventoryService.GetCountsByDestinationAsync(GetUserId(), householdId);

        if (!result.Success)
        {
            if (result.Message == "Access denied")
                return Forbid();
            return StatusCode(500, result);
        }

        return Ok(result);
    }

    // GET: api/inventory/items/search?householdId={guid}&q={string}&page={int}&pageSize={int}
    [HttpGet("items/search")]
    public async Task<ActionResult<ApiResponse<PagedResponse<ItemResponse>>>> SearchItems(
        [FromQuery] Guid? householdId = null,
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30
    )
    {
        page = Math.Max(page, 1);
        pageSize = Math.Min(pageSize, 50);

        var result = await _inventoryService.SearchItemsAsync(
            GetUserId(),
            householdId,
            q ?? string.Empty,
            page,
            pageSize
        );

        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    // GET: api/inventory/items/{id}
    [HttpGet("items/{id}")]
    public async Task<ActionResult<ApiResponse<ItemResponse>>> GetItem(Guid id)
    {
        var result = await _inventoryService.GetItemAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }

    // POST: api/inventory/items
    [HttpPost("items")]
    public async Task<ActionResult<ApiResponse<ItemResponse>>> CreateItem(
        CreateItemRequest request
    )
    {
        var result = await _inventoryService.CreateItemAsync(request, GetUserId());

        if (!result.Success)
        {
            if (result.Message == "Access denied")
                return Forbid();
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetItem), new { id = result.Data!.Id }, result);
    }

    // PUT: api/inventory/items/{id}
    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(Guid id, UpdateItemRequest request)
    {
        var result = await _inventoryService.UpdateItemAsync(id, request, GetUserId());

        if (!result.Success)
            return NotFound();

        return NoContent();
    }

    // DELETE: api/inventory/items/{id}
    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        var result = await _inventoryService.DeleteItemAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return NoContent();
    }

    // POST: api/inventory/items/{id}/resolve
    [HttpPost("items/{id}/resolve")]
    public async Task<ActionResult<ApiResponse<ItemResponse>>> ResolveItem(
        Guid id,
        ResolveItemRequest request
    )
    {
        var result = await _inventoryService.ResolveItemAsync(id, request, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }

    // POST: api/inventory/items/{id}/restore
    [HttpPost("items/{id}/restore")]
    public async Task<ActionResult<ApiResponse<ItemResponse>>> RestoreItem(Guid id)
    {
        var result = await _inventoryService.RestoreItemAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }
}