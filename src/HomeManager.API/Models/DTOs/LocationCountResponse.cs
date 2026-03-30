namespace HomeManager.API.Models.DTOs;

public class LocationCountResponse
{
    public Guid? LocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public int Count { get; set; }
}