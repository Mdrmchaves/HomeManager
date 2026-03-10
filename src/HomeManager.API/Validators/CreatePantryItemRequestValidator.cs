using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class CreatePantryItemRequestValidator : AbstractValidator<CreatePantryItemRequest>
{
    public CreatePantryItemRequestValidator()
    {
        RuleFor(x => x.HouseholdId).NotEmpty().WithMessage("Household ID is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Item name is required")
            .MaximumLength(200)
            .WithMessage("Item name cannot exceed 200 characters");

        RuleFor(x => x.Quantity)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Quantity must be greater than or equal to 0");

        RuleFor(x => x.Unit)
            .MaximumLength(20)
            .WithMessage("Unit cannot exceed 20 characters")
            .When(x => !string.IsNullOrEmpty(x.Unit));

        RuleFor(x => x.MinQuantity)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Minimum quantity must be greater than or equal to 0")
            .When(x => x.MinQuantity.HasValue);

        RuleFor(x => x.Notes)
            .MaximumLength(500)
            .WithMessage("Notes cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Notes));
    }
}
