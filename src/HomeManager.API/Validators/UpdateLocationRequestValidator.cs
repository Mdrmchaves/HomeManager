using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class UpdateLocationRequestValidator : AbstractValidator<UpdateLocationRequest>
{
    public UpdateLocationRequestValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(100)
            .WithMessage("Location name cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Icon)
            .MaximumLength(50)
            .WithMessage("Icon identifier cannot exceed 50 characters")
            .When(x => !string.IsNullOrEmpty(x.Icon));
    }
}
