using FluentValidation;
using HomeManager.API.Controllers;
using HomeManager.API.Models.DTOs;

namespace HomeManager.API.Validators;

public class CreateHouseholdRequestValidator : AbstractValidator<CreateHouseholdRequest>
{
    public CreateHouseholdRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Household name is required")
            .MinimumLength(2)
            .WithMessage("Household name must be at least 2 characters")
            .MaximumLength(255)
            .WithMessage("Household name cannot exceed 255 characters");
    }
}
