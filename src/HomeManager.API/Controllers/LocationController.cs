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
public class LocationController : ControllerBase
{
    private readonly ILocationService _locationService;

    public LocationController(ILocationService locationService)
    {
        _locationService = locationService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/households/{householdId}/locations
    [HttpGet("households/{householdId}/locations")]
    public async Task<ActionResult<ApiResponse<List<LocationResponse>>>> GetLocations(
        Guid householdId
    )
    {
        var response = await _locationService.GetLocationsAsync(householdId, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // POST: api/households/{householdId}/locations
    [HttpPost("households/{householdId}/locations")]
    public async Task<ActionResult<ApiResponse<LocationResponse>>> CreateLocation(
        Guid householdId,
        CreateLocationRequest request
    )
    {
        var response = await _locationService.CreateLocationAsync(householdId, request, GetUserId());

        if (!response.Success)
            return BadRequest(response);

        return CreatedAtAction(
            nameof(GetLocations),
            new { householdId },
            response
        );
    }

    // PUT: api/locations/{id}
    [HttpPut("locations/{id}")]
    public async Task<ActionResult<ApiResponse<LocationResponse>>> UpdateLocation(
        Guid id,
        UpdateLocationRequest request
    )
    {
        var response = await _locationService.UpdateLocationAsync(id, request, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }

    // DELETE: api/locations/{id}
    [HttpDelete("locations/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteLocation(Guid id)
    {
        var response = await _locationService.DeleteLocationAsync(id, GetUserId());

        if (!response.Success)
            return NotFound(response);

        return Ok(response);
    }
}
