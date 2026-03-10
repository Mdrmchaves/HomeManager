using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class CreateCategoryRequestValidator : AbstractValidator<CreateCategoryRequest>
{
    private static readonly string[] ValidTypes = ["pertences", "despensa"];

    public CreateCategoryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Category name is required")
            .MaximumLength(100)
            .WithMessage("Category name cannot exceed 100 characters");

        RuleFor(x => x.Type)
            .NotEmpty()
            .WithMessage("Category type is required")
            .Must(t => ValidTypes.Contains(t))
            .WithMessage("Category type must be 'pertences' or 'despensa'");
    }
}
