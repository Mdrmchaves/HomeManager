using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class UpdatePantryItemRequestValidator : AbstractValidator<UpdatePantryItemRequest>
{
    public UpdatePantryItemRequestValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(200)
            .WithMessage("Item name cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Quantity)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Quantity must be greater than or equal to 0")
            .When(x => x.Quantity.HasValue);

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
