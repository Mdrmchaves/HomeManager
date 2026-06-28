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
                var title = $"Pagar: {request.Description}";

                Guid recurrenceId;
                if (request.Type == "installment" && request.TotalInstallments.HasValue)
                {
                    int remaining = request.TotalInstallments.Value - request.InstallmentsPaid;
                    var desc = FormatInstallmentDescription(request.Amount, request.Currency, request.TotalInstallments.Value, request.DayOfMonth.Value);
                    recurrenceId = await CreateInstallmentTasksAsync(request.HouseholdId, userId, request.DayOfMonth.Value, title, desc, remaining);
                }
                else
                {
                    var desc = FormatFixedDescription(request.Amount, request.Currency, request.DayOfMonth.Value);
                    recurrenceId = await CreateFixedRecurrenceAsync(request.HouseholdId, userId, request.DayOfMonth.Value, title, desc);
                }

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

            string previousType = item.Type;

            item.Description = request.Description;
            item.Amount = request.Amount;
            item.Currency = request.Currency;
            item.Category = string.IsNullOrEmpty(request.Category) ? null : request.Category;
            item.Type = request.Type;
            item.DayOfMonth = request.DayOfMonth;
            item.TotalInstallments = request.Type == "installment" ? request.TotalInstallments : null;
            item.InstallmentsPaid = request.Type == "installment" ? request.InstallmentsPaid : 0;
            item.IsActive = request.IsActive;

            var title = $"Pagar: {request.Description}";

            if (item.TaskRecurrenceId.HasValue)
            {
                var recurrence = await m_context.TaskRecurrences.FindAsync(item.TaskRecurrenceId.Value);
                if (recurrence != null)
                {
                    if (!request.IsActive || !request.DayOfMonth.HasValue)
                    {
                        // Desactivar ou dia removido → apaga tarefas futuras e desactiva âncora
                        await DeleteFutureTasksAsync(recurrence.Id);
                        recurrence.IsActive = false;
                        if (!request.DayOfMonth.HasValue)
                            item.TaskRecurrenceId = null;
                    }
                    else if (previousType != request.Type)
                    {
                        // Tipo mudou → recria tudo do zero
                        await DeleteFutureTasksAsync(recurrence.Id);
                        recurrence.IsActive = false;
                        item.TaskRecurrenceId = null;

                        item.TaskRecurrenceId = await CreateTasksForTypeAsync(
                            request.Type, request.TotalInstallments, request.InstallmentsPaid,
                            request.DayOfMonth.Value, title, request.Amount, request.Currency,
                            item.HouseholdId, userId);
                    }
                    else if (request.Type == "installment")
                    {
                        // Parcelas: reconciliar contagem + rescheduling se dia mudou
                        int remaining = (request.TotalInstallments ?? 0) - request.InstallmentsPaid;
                        var desc = FormatInstallmentDescription(request.Amount, request.Currency, request.TotalInstallments ?? 0, request.DayOfMonth.Value);
                        recurrence.RecurrenceDay = request.DayOfMonth;
                        await ReconcileInstallmentTasksAsync(recurrence.Id, remaining, request.DayOfMonth.Value, title, desc, userId, item.HouseholdId);
                    }
                    else
                    {
                        // Fixed: actualiza recorrência activa
                        if (!recurrence.IsActive) recurrence.IsActive = true;
                        recurrence.RecurrenceDay = request.DayOfMonth;
                        var desc = FormatFixedDescription(request.Amount, request.Currency, request.DayOfMonth.Value);
                        await UpdateFutureTaskTitlesAsync(recurrence.Id, title, desc);
                    }
                }
            }
            else if (request.IsActive && request.DayOfMonth.HasValue)
            {
                // Sem recorrência ainda (dia foi adicionado agora) → criar
                item.TaskRecurrenceId = await CreateTasksForTypeAsync(
                    request.Type, request.TotalInstallments, request.InstallmentsPaid,
                    request.DayOfMonth.Value, title, request.Amount, request.Currency,
                    item.HouseholdId, userId);
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

            if (item.TaskRecurrenceId.HasValue)
            {
                var recurrence = await m_context.TaskRecurrences.FindAsync(item.TaskRecurrenceId.Value);
                if (recurrence != null)
                {
                    await DeleteFutureTasksAsync(recurrence.Id);
                    recurrence.IsActive = false;
                }
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

    // ── Task creation ─────────────────────────────────────────────────────────

    private async Task<Guid> CreateTasksForTypeAsync(
        string type, int? totalInstallments, int installmentsPaid,
        int dayOfMonth, string title, decimal amount, string currency,
        Guid householdId, Guid userId)
    {
        if (type == "installment" && totalInstallments.HasValue)
        {
            int remaining = totalInstallments.Value - installmentsPaid;
            var desc = FormatInstallmentDescription(amount, currency, totalInstallments.Value, dayOfMonth);
            return await CreateInstallmentTasksAsync(householdId, userId, dayOfMonth, title, desc, remaining);
        }
        else
        {
            var desc = FormatFixedDescription(amount, currency, dayOfMonth);
            return await CreateFixedRecurrenceAsync(householdId, userId, dayOfMonth, title, desc);
        }
    }

    private async Task<Guid> CreateFixedRecurrenceAsync(
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

        var firstDate = NextOccurrenceFrom(DateOnly.FromDateTime(DateTime.UtcNow), dayOfMonth);
        m_context.Tasks.Add(BuildTask(householdId, userId, recurrence.Id, title, description, firstDate));

        return recurrence.Id;
    }

    private async Task<Guid> CreateInstallmentTasksAsync(
        Guid householdId, Guid userId, int dayOfMonth, string title, string description, int remaining)
    {
        // Recurrence is inactive — used only as a group anchor (no lazy generation)
        var recurrence = new TaskRecurrence
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Pattern = "monthly",
            RecurrenceDay = dayOfMonth,
            IsActive = false,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };
        m_context.TaskRecurrences.Add(recurrence);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var cursor = NextOccurrenceFrom(today, dayOfMonth);
        for (int i = 0; i < remaining; i++)
        {
            m_context.Tasks.Add(BuildTask(householdId, userId, recurrence.Id, title, description, cursor));
            cursor = NextOccurrenceFrom(cursor.AddDays(1), dayOfMonth);
        }

        return recurrence.Id;
    }

    // ── Task reconciliation ───────────────────────────────────────────────────

    private async Task ReconcileInstallmentTasksAsync(
        Guid recurrenceId, int remaining, int dayOfMonth, string title, string description,
        Guid userId, Guid householdId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayDt = today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        // Delete all future tasks and recreate — simplest way to handle day + count changes
        var futureTasks = await m_context.Tasks
            .Where(t => t.RecurrenceId == recurrenceId && t.DueDate >= todayDt && t.Status == "active")
            .ToListAsync();
        m_context.Tasks.RemoveRange(futureTasks);

        var cursor = NextOccurrenceFrom(today, dayOfMonth);
        for (int i = 0; i < remaining; i++)
        {
            m_context.Tasks.Add(BuildTask(householdId, userId, recurrenceId, title, description, cursor));
            cursor = NextOccurrenceFrom(cursor.AddDays(1), dayOfMonth);
        }
    }

    private async Task UpdateFutureTaskTitlesAsync(Guid recurrenceId, string newTitle, string newDescription)
    {
        var todayDt = DateOnly.FromDateTime(DateTime.UtcNow).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

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

    private async Task DeleteFutureTasksAsync(Guid recurrenceId)
    {
        var todayDt = DateOnly.FromDateTime(DateTime.UtcNow).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var futureTasks = await m_context.Tasks
            .Where(t => t.RecurrenceId == recurrenceId && t.DueDate >= todayDt && t.Status == "active")
            .ToListAsync();
        m_context.Tasks.RemoveRange(futureTasks);
    }

    // ── Factories / utilities ─────────────────────────────────────────────────

    private static TaskEntity BuildTask(Guid householdId, Guid userId, Guid recurrenceId, string title, string description, DateOnly dueDate) =>
        new()
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecurrenceId = recurrenceId,
            Title = title,
            Description = description,
            DueDate = dueDate.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
            Status = "active",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    private static DateOnly NextOccurrenceFrom(DateOnly from, int dayOfMonth)
    {
        for (int offset = 0; offset < 2; offset++)
        {
            var anchor = from.AddMonths(offset);
            int clamped = Math.Min(dayOfMonth, DateTime.DaysInMonth(anchor.Year, anchor.Month));
            var candidate = new DateOnly(anchor.Year, anchor.Month, clamped);
            if (candidate >= from) return candidate;
        }
        return from;
    }

    private static string FormatFixedDescription(decimal amount, string currency, int dayOfMonth) =>
        $"{amount:N2} {currency} — vence dia {dayOfMonth}";

    private static string FormatInstallmentDescription(decimal amount, string currency, int totalInstallments, int dayOfMonth) =>
        $"{amount:N2} {currency} — {totalInstallments}x — vence dia {dayOfMonth}";
}
