using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Finance;
using Microsoft.EntityFrameworkCore;
using TaskEntity = HomeManager.API.Models.Tasks.Task;
using TaskRecurrence = HomeManager.API.Models.Tasks.TaskRecurrence;

namespace HomeManager.API.Services.Finance;

public class PlanningService : IPlanningService
{
    private readonly ILogger<PlanningService> m_logger;
    private readonly ApplicationDbContext m_context;

    public PlanningService(ILogger<PlanningService> logger, ApplicationDbContext context)
    {
        m_logger = logger;
        m_context = context;
    }

    private async Task<bool> HasAccessAsync(Guid householdId, Guid userId) =>
        await m_context.HouseholdUsers
            .AnyAsync(hu => hu.HouseholdId == householdId && hu.UserId == userId);

    public async Task<ApiResponse<List<PlanningItemResponse>>> GetItemsAsync(Guid householdId, Guid userId, string? month = null)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<List<PlanningItemResponse>>.ErrorResponse("Access denied");

            var items = await m_context.FinancePlanningItems
                .Where(p => p.HouseholdId == householdId && p.IsActive)
                .OrderBy(p => p.DayOfMonth == null ? 1 : 0)
                .ThenBy(p => p.DayOfMonth)
                .ThenBy(p => p.Description)
                .ToListAsync();

            Dictionary<Guid, (Guid txId, bool isCC)> paidMap = [];
            if (!string.IsNullOrEmpty(month) && items.Count > 0)
            {
                var ids = items.Select(i => i.Id).ToHashSet();
                var paidTxs = await m_context.FinanceTransactions
                    .Where(t => t.PlanningItemId.HasValue && ids.Contains(t.PlanningItemId.Value) && t.RefMonth == month)
                    .Include(t => t.Account)
                    .ToListAsync();
                foreach (var t in paidTxs)
                    paidMap[t.PlanningItemId!.Value] = (t.Id, t.Account?.Type == "cc");
            }

            return ApiResponse<List<PlanningItemResponse>>.SuccessResponse(
                items.Select(p =>
                {
                    var paid = paidMap.TryGetValue(p.Id, out var info);
                    return PlanningItemResponse.FromEntity(p, paid, paid ? info.txId : null, paid && info.isCC);
                }).ToList());
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting planning items for household {HouseholdId}", householdId);
            return ApiResponse<List<PlanningItemResponse>>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PlanningItemResponse>> CreateItemAsync(CreatePlanningItemRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<PlanningItemResponse>.ErrorResponse("Access denied");

            var item = new FinancePlanningItem
            {
                Id = Guid.NewGuid(),
                HouseholdId = request.HouseholdId,
                Description = request.Description,
                Amount = request.Amount,
                Currency = request.Currency,
                Category = request.Category,
                Type = request.Type,
                DayOfMonth = request.DayOfMonth,
                TotalInstallments = request.Type == "installment" ? request.TotalInstallments : null,
                InstallmentsPaid = request.Type == "installment" ? request.InstallmentsPaid : 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            m_context.FinancePlanningItems.Add(item);

            if (request.DayOfMonth.HasValue)
            {
                var recurrenceId = await CreatePaymentRecurrenceAsync(
                    householdId: request.HouseholdId,
                    userId: userId,
                    dayOfMonth: request.DayOfMonth.Value,
                    title: $"Pagar: {request.Description}",
                    description: FormatPlanningDescription(request.Amount, request.Currency, request.DayOfMonth.Value)
                );
                item.TaskRecurrenceId = recurrenceId;
            }

            await m_context.SaveChangesAsync();

            return ApiResponse<PlanningItemResponse>.SuccessResponse(PlanningItemResponse.FromEntity(item), "Item created");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error creating planning item for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<PlanningItemResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PlanningItemResponse>> UpdateItemAsync(Guid id, UpdatePlanningItemRequest request, Guid userId)
    {
        try
        {
            var item = await m_context.FinancePlanningItems.FindAsync(id);
            if (item is null)
                return ApiResponse<PlanningItemResponse>.ErrorResponse("Item not found");

            if (!await HasAccessAsync(item.HouseholdId, userId))
                return ApiResponse<PlanningItemResponse>.ErrorResponse("Access denied");

            bool titleChanged = item.Description != request.Description || item.Amount != request.Amount || item.Currency != request.Currency;
            bool dayChanged = item.DayOfMonth != request.DayOfMonth;
            bool activeChanged = item.IsActive != request.IsActive;

            item.Description = request.Description;
            item.Amount = request.Amount;
            item.Currency = request.Currency;
            item.Category = string.IsNullOrEmpty(request.Category) ? null : request.Category;
            item.Type = request.Type;
            item.DayOfMonth = request.DayOfMonth;
            item.TotalInstallments = request.Type == "installment" ? request.TotalInstallments : null;
            item.InstallmentsPaid = request.Type == "installment" ? request.InstallmentsPaid : 0;
            item.IsActive = request.IsActive;

            // Sync task recurrence
            if (item.TaskRecurrenceId.HasValue)
            {
                var recurrence = await m_context.TaskRecurrences.FindAsync(item.TaskRecurrenceId.Value);
                if (recurrence != null)
                {
                    if (!request.IsActive)
                    {
                        // Item desactivado → desactiva recorrência
                        recurrence.IsActive = false;
                    }
                    else if (!request.DayOfMonth.HasValue)
                    {
                        // Dia removido → desactiva recorrência
                        recurrence.IsActive = false;
                        item.TaskRecurrenceId = null;
                    }
                    else
                    {
                        // Reactivar se estava inactiva
                        if (activeChanged && request.IsActive)
                            recurrence.IsActive = true;

                        // Actualiza dia se mudou
                        if (dayChanged)
                            recurrence.RecurrenceDay = request.DayOfMonth;

                        // Actualiza título das instâncias futuras se título/valor mudou
                        if (titleChanged)
                        {
                            var newTitle = $"Pagar: {request.Description}";
                            var newDesc = FormatPlanningDescription(request.Amount, request.Currency, request.DayOfMonth!.Value);
                            await UpdateFutureTaskTitlesAsync(recurrence.Id, newTitle, newDesc);
                        }
                    }
                }
            }
            else if (request.IsActive && request.DayOfMonth.HasValue)
            {
                // Dia adicionado agora (item existia sem dia) → cria recorrência
                var recurrenceId = await CreatePaymentRecurrenceAsync(
                    householdId: item.HouseholdId,
                    userId: userId,
                    dayOfMonth: request.DayOfMonth.Value,
                    title: $"Pagar: {request.Description}",
                    description: FormatPlanningDescription(request.Amount, request.Currency, request.DayOfMonth.Value)
                );
                item.TaskRecurrenceId = recurrenceId;
            }

            await m_context.SaveChangesAsync();

            return ApiResponse<PlanningItemResponse>.SuccessResponse(PlanningItemResponse.FromEntity(item));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error updating planning item {Id}", id);
            return ApiResponse<PlanningItemResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId)
    {
        try
        {
            var item = await m_context.FinancePlanningItems.FindAsync(id);
            if (item is null)
                return ApiResponse<bool>.ErrorResponse("Item not found");

            if (!await HasAccessAsync(item.HouseholdId, userId))
                return ApiResponse<bool>.ErrorResponse("Access denied");

            // Desactiva recorrência antes de apagar o item
            if (item.TaskRecurrenceId.HasValue)
            {
                var recurrence = await m_context.TaskRecurrences.FindAsync(item.TaskRecurrenceId.Value);
                if (recurrence != null)
                    recurrence.IsActive = false;
            }

            m_context.FinancePlanningItems.Remove(item);
            await m_context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Item deleted");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error deleting planning item {Id}", id);
            return ApiResponse<bool>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> CreatePaymentRecurrenceAsync(
        Guid householdId, Guid userId, int dayOfMonth, string title, string description)
    {
        var recurrence = new TaskRecurrence
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Pattern = "monthly",
            RecurrenceDay = dayOfMonth,
            IsActive = true,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };
        m_context.TaskRecurrences.Add(recurrence);

        // Primeira instância na próxima ocorrência do dia no mês
        var firstDate = NextOccurrence(dayOfMonth);
        m_context.Tasks.Add(new TaskEntity
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecurrenceId = recurrence.Id,
            Title = title,
            Description = description,
            DueDate = firstDate.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
            Status = "active",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        return recurrence.Id;
    }

    private async Task UpdateFutureTaskTitlesAsync(Guid recurrenceId, string newTitle, string newDescription)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayDt = today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var futureTasks = await m_context.Tasks
            .Where(t => t.RecurrenceId == recurrenceId && t.DueDate >= todayDt && t.Status == "active")
            .ToListAsync();

        foreach (var t in futureTasks)
        {
            t.Title = newTitle;
            t.Description = newDescription;
            t.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static DateOnly NextOccurrence(int dayOfMonth)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int offset = 0; offset < 2; offset++)
        {
            var anchor = today.AddMonths(offset);
            int clamped = Math.Min(dayOfMonth, DateTime.DaysInMonth(anchor.Year, anchor.Month));
            var candidate = new DateOnly(anchor.Year, anchor.Month, clamped);
            if (candidate >= today) return candidate;
        }
        return today;
    }

    private static string FormatPlanningDescription(decimal amount, string currency, int dayOfMonth) =>
        $"{amount:N2} {currency} — vence dia {dayOfMonth}";
}
