using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Name is required")
            .MaximumLength(255)
            .WithMessage("Name cannot exceed 255 characters");
    }
}
