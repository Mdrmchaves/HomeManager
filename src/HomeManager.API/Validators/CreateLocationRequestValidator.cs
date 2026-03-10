using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class CreateLocationRequestValidator : AbstractValidator<CreateLocationRequest>
{
    public CreateLocationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Location name is required")
            .MaximumLength(100)
            .WithMessage("Location name cannot exceed 100 characters");

        RuleFor(x => x.Icon)
            .MaximumLength(50)
            .WithMessage("Icon identifier cannot exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Icon));
    }
}
