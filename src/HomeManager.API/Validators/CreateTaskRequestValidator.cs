using FluentValidation;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Validators;

public class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.HouseholdId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description != null);
    }
}
