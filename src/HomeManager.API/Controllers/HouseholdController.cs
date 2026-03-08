using System.Security.Claims;
using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Shared;
using HomeManager.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneOf;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HouseholdController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHouseholdService m_householdService;

    public HouseholdController(ApplicationDbContext context, IHouseholdService householdService)
    {
        _context = context;
        m_householdService = householdService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Household>>>> GetMyHouseholds()
    {
        return Ok(await m_householdService.GetMyHouseholds(Guid.Empty, GetUserId()));
    }

    // GET: api/household/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Household>>> GetHousehold(Guid id)
    {
        return Ok(await m_householdService.GetHouseholdAsync(id, GetUserId()));
    }

    // POST: api/household
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Household>>> CreateHousehold(
        CreateHouseholdRequest request
    )
    {
        var response = await m_householdService.CreateHouseholdAsync(request, GetUserId());

        if (!response.Success)
        {
            return BadRequest(response);
        }

        return CreatedAtAction(nameof(GetHousehold), new { id = response.Data?.Id }, response);
    }

    // POST: api/household/join/{inviteCode}
    [HttpPost("join/{inviteCode}")]
    public async Task<ActionResult<ApiResponse<Household>>> JoinHousehold(string inviteCode)
    {
        return Ok(await m_householdService.JoinHouseholdAsync(inviteCode, GetUserId()));
    }
}
