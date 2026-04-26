namespace HomeManager.API.Models.DTOs.Requests;

public record ApplyTemplatesRequest(
    Guid HouseholdId,
    string Month   // YYYY-MM — the month to generate transactions for
);
