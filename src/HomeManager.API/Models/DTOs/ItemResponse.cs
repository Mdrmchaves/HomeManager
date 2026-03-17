using HomeManager.API.Models.Inventory;

namespace HomeManager.API.Models.DTOs;

public class ItemResponse
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal? Value { get; set; }
    public string? PhotoUrl { get; set; }
    public Guid? LocationId { get; set; }
    public string? LocationName { get; set; }
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int? Quantity { get; set; }
    public string? Destination { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static ItemResponse FromEntity(InventoryItem item) => new()
    {
        Id = item.Id,
        HouseholdId = item.HouseholdId,
        Name = item.Name,
        Description = item.Description,
        Value = item.Value,
        PhotoUrl = item.PhotoUrl,
        LocationId = item.LocationId,
        LocationName = item.LocationRef?.Name,
        CategoryId = item.CategoryId,
        CategoryName = item.Category?.Name,
        Quantity = item.Quantity,
        Destination = item.Destination,
        CreatedAt = item.CreatedAt,
        UpdatedAt = item.UpdatedAt,
    };
}
