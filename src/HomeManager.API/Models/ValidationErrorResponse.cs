namespace HomeManager.API.Models;

public class ValidationErrorResponse
{
    public string Message { get; set; } = "Validation failed";
    public Dictionary<string, string[]> Errors { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
