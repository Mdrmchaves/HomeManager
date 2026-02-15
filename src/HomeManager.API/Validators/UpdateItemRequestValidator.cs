using FluentValidation;
using HomeManager.API.Controllers;
using HomeManager.API.Models.DTOs;

namespace HomeManager.API.Validators;

public class UpdateItemRequestValidator : AbstractValidator<UpdateItemRequest>
{
    public UpdateItemRequestValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(255)
            .WithMessage("Item name cannot exceed 255 characters")
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Description)
            .MaximumLength(1000)
            .WithMessage("Description cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.Description));

        RuleFor(x => x.Value)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Value must be greater than or equal to 0")
            .When(x => x.Value.HasValue);

        RuleFor(x => x.Location)
            .MaximumLength(255)
            .WithMessage("Location cannot exceed 255 characters")
            .When(x => !string.IsNullOrEmpty(x.Location));

        RuleFor(x => x.Destination)
            .Must(BeValidDestination)
            .WithMessage("Destination must be one of: Undecided, Take, Sell, Donate, Trash")
            .When(x => !string.IsNullOrEmpty(x.Destination));
    }

    private bool BeValidDestination(string? destination)
    {
        if (string.IsNullOrEmpty(destination))
            return true;

        var validDestinations = new[] { "Undecided", "Take", "Sell", "Donate", "Trash" };
        return validDestinations.Contains(destination);
    }
}
