using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class UpsertBudgetRequestValidator : AbstractValidator<UpsertBudgetRequest>
{
    private static readonly string[] ValidCategories = ["lf", "cf", "co", "mt", "pr", "es"];

    public UpsertBudgetRequestValidator()
    {
        RuleFor(x => x.HouseholdId)
            .NotEmpty()
            .WithMessage("Household ID is required");

        RuleFor(x => x.Income)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Income must be greater than or equal to 0")
            .When(x => x.Income.HasValue);

        RuleFor(x => x.IncomeCurrency)
            .MaximumLength(10)
            .WithMessage("Income currency cannot exceed 10 characters")
            .When(x => x.IncomeCurrency != null);

        RuleFor(x => x.Goals)
            .NotNull()
            .WithMessage("Goals are required")
            .Must(g => g.Keys.All(k => ValidCategories.Contains(k)))
            .WithMessage($"Goal keys must be one of: {string.Join(", ", ValidCategories)}")
            .Must(g => g.Values.All(v => v >= 0 && v <= 100))
            .WithMessage("Goal values must be between 0 and 100")
            .When(x => x.Goals != null);
    }
}
