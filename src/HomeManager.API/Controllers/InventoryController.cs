using System.Security.Claims;
using HomeManager.API.Data;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public InventoryController(ApplicationDbContext context)
    {
        _context = context;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/inventory/items
    [HttpGet("items")]
    public async Task<ActionResult<IEnumerable<InventoryItem>>> GetItems(
        [FromQuery] Guid? householdId = null
    )
    {
        var userId = GetUserId();

        var query = _context
            .InventoryItems.Include(i => i.Owner)
            .Include(i => i.List)
            .Where(i => i.Household.HouseholdUsers.Any(hu => hu.UserId == userId));

        if (householdId.HasValue)
        {
            query = query.Where(i => i.HouseholdId == householdId.Value);
        }

        var items = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();

        return Ok(items);
    }

    // GET: api/inventory/items/{id}
    [HttpGet("items/{id}")]
    public async Task<ActionResult<InventoryItem>> GetItem(Guid id)
    {
        var userId = GetUserId();

        var item = await _context
            .InventoryItems.Include(i => i.Owner)
            .Include(i => i.List)
            .Include(i => i.Household)
            .FirstOrDefaultAsync(i =>
                i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (item == null)
            return NotFound();

        return Ok(item);
    }

    // POST: api/inventory/items
    [HttpPost("items")]
    public async Task<ActionResult<InventoryItem>> CreateItem(CreateItemRequest request)
    {
        var userId = GetUserId();

        // Verifica se user pertence à household
        var hasAccess = await _context.HouseholdUsers.AnyAsync(hu =>
            hu.HouseholdId == request.HouseholdId && hu.UserId == userId
        );

        if (!hasAccess)
            return Forbid();

        var item = new InventoryItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = request.HouseholdId,
            Name = request.Name,
            Description = request.Description,
            Value = request.Value,
            Location = request.Location,
            Destination = request.Destination,
            OwnerId = request.OwnerId,
            Tags = request.Tags,
            ListId = request.ListId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetItem), new { id = item.Id }, item);
    }

    // PUT: api/inventory/items/{id}
    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(Guid id, UpdateItemRequest request)
    {
        var userId = GetUserId();

        var item = await _context
            .InventoryItems.Include(i => i.Household)
            .FirstOrDefaultAsync(i =>
                i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (item == null)
            return NotFound();

        item.Name = request.Name ?? item.Name;
        item.Description = request.Description ?? item.Description;
        item.Value = request.Value ?? item.Value;
        item.PhotoUrl = request.PhotoUrl ?? item.PhotoUrl;
        item.Location = request.Location ?? item.Location;
        item.Destination = request.Destination ?? item.Destination;
        item.OwnerId = request.OwnerId ?? item.OwnerId;
        item.Tags = request.Tags ?? item.Tags;
        item.ListId = request.ListId ?? item.ListId;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/inventory/items/{id}
    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        var userId = GetUserId();

        var item = await _context
            .InventoryItems.Include(i => i.Household)
            .FirstOrDefaultAsync(i =>
                i.Id == id && i.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
            );

        if (item == null)
            return NotFound();

        _context.InventoryItems.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
