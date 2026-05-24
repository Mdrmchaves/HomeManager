namespace HomeManager.API.Models.DTOs.Requests;

public record CreateHouseholdRequest(string Name, string DefaultCurrency = "BRL");
