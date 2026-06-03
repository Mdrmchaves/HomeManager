using System.Security.Claims;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Services.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/planning")]
[Authorize]
public class PlanningController : ControllerBase
{
    private readonly IPlanningService m_planningService;

    public PlanningController(IPlanningService planningService)
    {
        m_planningService = planningService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/planning?householdId={guid}
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PlanningItemResponse>>>> GetItems([FromQuery] Guid householdId)
    {
        var result = await m_planningService.GetItemsAsync(householdId, GetUserId());
        return result.Success ? Ok(result) : Forbid();
    }

    // POST: api/planning
    [HttpPost]
    public async Task<ActionResult<ApiResponse<PlanningItemResponse>>> CreateItem(CreatePlanningItemRequest request)
    {
        var result = await m_planningService.CreateItemAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetItems), new { householdId = result.Data!.HouseholdId }, result);
    }

    // PUT: api/planning/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<PlanningItemResponse>>> UpdateItem(Guid id, UpdatePlanningItemRequest request)
    {
        var result = await m_planningService.UpdateItemAsync(id, request, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // DELETE: api/planning/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid id)
    {
        var result = await m_planningService.DeleteItemAsync(id, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }
}
