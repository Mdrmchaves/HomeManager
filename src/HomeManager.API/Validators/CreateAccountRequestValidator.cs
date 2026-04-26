using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    private static readonly string[] ValidCurrencies = ["BRL", "EUR", "USD", "PYG"];
    private static readonly string[] ValidTypes = ["account", "cc"];

    public CreateAccountRequestValidator()
    {
        RuleFor(x => x.HouseholdId)
            .NotEmpty()
            .WithMessage("Household ID is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Account name is required")
            .MaximumLength(255)
            .WithMessage("Account name cannot exceed 255 characters");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .WithMessage("Currency is required")
            .Must(c => ValidCurrencies.Contains(c))
            .WithMessage("Currency must be one of: BRL, EUR, USD, PYG");

        RuleFor(x => x.Type)
            .NotEmpty()
            .WithMessage("Account type is required")
            .Must(t => ValidTypes.Contains(t))
            .WithMessage("Type must be 'account' or 'cc'");

        RuleFor(x => x.CloseDay)
            .InclusiveBetween(1, 31)
            .WithMessage("CloseDay must be between 1 and 31")
            .When(x => x.CloseDay.HasValue);

        RuleFor(x => x.DueDay)
            .InclusiveBetween(1, 31)
            .WithMessage("DueDay must be between 1 and 31")
            .When(x => x.DueDay.HasValue);

        RuleFor(x => x.Limit)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Limit must be greater than or equal to 0")
            .When(x => x.Limit.HasValue);
    }
}
