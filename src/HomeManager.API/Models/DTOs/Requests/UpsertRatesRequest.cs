namespace HomeManager.API.Models.DTOs.Requests;

public record UpsertRatesRequest(
    Guid HouseholdId,
    Dictionary<string, decimal> Rates   // e.g. { "BRL": 1, "EUR": 6.0, "USD": 5.5, "PYG": 0.0007 }
);
