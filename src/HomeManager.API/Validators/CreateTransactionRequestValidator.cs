using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class CreateTransactionRequestValidator : AbstractValidator<CreateTransactionRequest>
{
    private static readonly string[] ValidTypes = ["income", "expense"];
    private static readonly string[] ValidCategories = ["lf", "cf", "co", "mt", "pr", "es"];

    public CreateTransactionRequestValidator()
    {
        RuleFor(x => x.HouseholdId)
            .NotEmpty()
            .WithMessage("Household ID is required");

        RuleFor(x => x.Description)
            .NotEmpty()
            .WithMessage("Description is required")
            .MaximumLength(500)
            .WithMessage("Description cannot exceed 500 characters");

        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .WithMessage("Amount must be greater than 0");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .WithMessage("Currency is required")
            .MaximumLength(10)
            .WithMessage("Currency cannot exceed 10 characters");

        RuleFor(x => x.Type)
            .NotEmpty()
            .WithMessage("Type is required")
            .Must(t => ValidTypes.Contains(t))
            .WithMessage("Type must be 'income' or 'expense'");

        RuleFor(x => x.Category)
            .Must(c => ValidCategories.Contains(c))
            .WithMessage("Category must be one of: lf, cf, co, mt, pr, es")
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.RefMonth)
            .Matches(@"^\d{4}-\d{2}$")
            .WithMessage("RefMonth must be in YYYY-MM format")
            .When(x => !string.IsNullOrEmpty(x.RefMonth));
    }
}
