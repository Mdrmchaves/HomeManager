using System.ComponentModel.DataAnnotations;

namespace HomeManager.API.Models.DTOs.Requests;

public class UpdatePlanningItemRequest
{
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(10)]
    public string Currency { get; set; } = "BRL";

    [MaxLength(10)]
    public string? Category { get; set; }

    [Required]
    public string Type { get; set; } = "fixed";

    [Range(1, 31)]
    public int? DayOfMonth { get; set; }

    [Range(1, 9999)]
    public int? TotalInstallments { get; set; }

    [Range(0, 9999)]
    public int InstallmentsPaid { get; set; }

    public bool IsActive { get; set; } = true;
}
