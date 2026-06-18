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

        When(x => x.RecurrencePattern != null, () =>
        {
            RuleFor(x => x.RecurrencePattern)
                .Must(p => p == "daily" || p == "weekly" || p == "monthly")
                .WithMessage("Padrão de recorrência inválido. Use: daily, weekly ou monthly");

            When(x => x.RecurrencePattern == "weekly", () =>
            {
                RuleFor(x => x.RecurrenceDay)
                    .NotNull()
                    .InclusiveBetween(1, 7)
                    .WithMessage("Dia da semana deve ser entre 1 (Domingo) e 7 (Sábado)");
            });

            When(x => x.RecurrencePattern == "monthly", () =>
            {
                RuleFor(x => x.RecurrenceDay)
                    .NotNull()
                    .InclusiveBetween(1, 31)
                    .WithMessage("Dia do mês deve ser entre 1 e 31");
            });
        });
    }
}
