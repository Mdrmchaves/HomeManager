using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Tasks;
using Microsoft.EntityFrameworkCore;
using TaskEntity = HomeManager.API.Models.Tasks.Task;

namespace HomeManager.API.Services.Tasks;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext m_context;
    private readonly ILogger<TaskService> m_logger;

    // Brazil/Porto Alegre = UTC-3, no daylight saving currently.
    // TODO future: move to a column on the household if users in other timezones are added.
    private static readonly TimeSpan m_householdOffset = TimeSpan.FromHours(-3);

    public TaskService(ApplicationDbContext context, ILogger<TaskService> logger)
    {
        m_context = context;
        m_logger = logger;
    }

    private DateOnly TodayInHouseholdTz()
    {
        var nowLocal = DateTime.UtcNow + m_householdOffset;
        return DateOnly.FromDateTime(nowLocal);
    }

    public async System.Threading.Tasks.Task<ApiResponse<List<TaskResponse>>> GetTasksByDateAsync(
        Guid householdId,
        Guid userId,
        DateOnly date
    )
    {
        m_logger.LogInformation(
            "Fetching tasks for household {HouseholdId} on date {Date} by user {UserId}",
            householdId, date, userId
        );
        try
        {
            var hasAccess = await m_context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == householdId && hu.UserId == userId
            );
            if (!hasAccess)
                return ApiResponse<List<TaskResponse>>.ErrorResponse("Forbidden");

            var today = TodayInHouseholdTz();
            var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var dayEnd = dayStart.AddDays(1);
            var todayStart = today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            List<TaskEntity> tasks;

            if (date < today)
            {
                // Histórico: só concluídas nesse dia
                tasks = await m_context.Tasks
                    .Include(t => t.Assignee)
                    .Include(t => t.CompletedByUser)
                    .Include(t => t.CreatedByUser)
                    .Include(t => t.Recurrence)
                    .Where(t =>
                        t.HouseholdId == householdId &&
                        t.Status == "completed" &&
                        t.CompletedAt >= dayStart && t.CompletedAt < dayEnd
                    )
                    .OrderBy(t => t.CompletedAt)
                    .ToListAsync();

                return ApiResponse<List<TaskResponse>>.SuccessResponse(
                    tasks.Select(MapToResponse).ToList()
                );
            }

            // Para hoje e futuro: gerar recorrências antes de buscar
            await EnsureRecurrenceInstancesAsync(householdId, date);

            if (date == today)
            {
                tasks = await m_context.Tasks
                    .Include(t => t.Assignee)
                    .Include(t => t.CompletedByUser)
                    .Include(t => t.CreatedByUser)
                    .Include(t => t.Recurrence)
                    .Where(t =>
                        t.HouseholdId == householdId &&
                        (
                            (t.Status == "active" && (
                                (t.DueDate >= dayStart && t.DueDate < dayEnd) ||
                                t.DueDate < todayStart ||
                                t.DueDate == null
                            )) ||
                            (t.Status == "completed" && t.CompletedAt >= dayStart && t.CompletedAt < dayEnd)
                        )
                    )
                    .ToListAsync();

                var ordered = tasks
                    .OrderBy(t => Rank(t, todayStart))
                    .ThenBy(t => t.DueDate ?? t.CreatedAt)
                    .ToList();

                return ApiResponse<List<TaskResponse>>.SuccessResponse(
                    ordered.Select(MapToResponse).ToList()
                );
            }
            else
            {
                // Futuro
                tasks = await m_context.Tasks
                    .Include(t => t.Assignee)
                    .Include(t => t.CompletedByUser)
                    .Include(t => t.CreatedByUser)
                    .Include(t => t.Recurrence)
                    .Where(t =>
                        t.HouseholdId == householdId &&
                        t.Status == "active" &&
                        t.DueDate >= dayStart && t.DueDate < dayEnd
                    )
                    .OrderBy(t => t.DueDate)
                    .ThenBy(t => t.CreatedAt)
                    .ToListAsync();

                return ApiResponse<List<TaskResponse>>.SuccessResponse(
                    tasks.Select(MapToResponse).ToList()
                );
            }
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error fetching tasks for household {HouseholdId} on date {Date}", householdId, date);
            return ApiResponse<List<TaskResponse>>.ErrorResponse($"Error fetching tasks: {ex.Message}");
        }
    }

    private static int Rank(TaskEntity t, DateTime todayStart)
    {
        if (t.Status == "completed") return 3;
        if (t.DueDate == null) return 2;
        if (t.DueDate < todayStart) return 0;
        return 1;
    }

    private async System.Threading.Tasks.Task EnsureRecurrenceInstancesAsync(Guid householdId, DateOnly date)
    {
        int dayOfWeek = ((int)date.DayOfWeek) + 1; // DayOfWeek.Sunday = 0 → 1
        int dayOfMonth = date.Day;

        var matchingRecurrences = await m_context.TaskRecurrences
            .Where(r =>
                r.HouseholdId == householdId &&
                r.IsActive &&
                (
                    r.Pattern == "daily" ||
                    (r.Pattern == "weekly" && r.RecurrenceDay == dayOfWeek) ||
                    (r.Pattern == "monthly" && r.RecurrenceDay == dayOfMonth)
                )
            )
            .ToListAsync();

        if (matchingRecurrences.Count == 0) return;

        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1);
        var dueDateValue = date.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);

        var recurrenceIds = matchingRecurrences.Select(r => r.Id).ToList();

        var existingForDay = await m_context.Tasks
            .Where(t =>
                t.RecurrenceId != null &&
                recurrenceIds.Contains(t.RecurrenceId!.Value) &&
                t.DueDate >= dayStart && t.DueDate < dayEnd
            )
            .Select(t => t.RecurrenceId!.Value)
            .ToListAsync();
        var existingSet = existingForDay.ToHashSet();

        var missingIds = recurrenceIds.Where(id => !existingSet.Contains(id)).ToList();
        if (missingIds.Count == 0) return;

        var latestPerSeries = await m_context.Tasks
            .Where(t => t.RecurrenceId != null && missingIds.Contains(t.RecurrenceId.Value))
            .GroupBy(t => t.RecurrenceId!.Value)
            .Select(g => g.OrderByDescending(t => t.CreatedAt).First())
            .ToListAsync();
        var latestMap = latestPerSeries.ToDictionary(t => t.RecurrenceId!.Value, t => t);

        foreach (var recurrence in matchingRecurrences.Where(r => missingIds.Contains(r.Id)))
        {
            latestMap.TryGetValue(recurrence.Id, out var last);
            m_context.Tasks.Add(new TaskEntity
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                RecurrenceId = recurrence.Id,
                Title = last?.Title ?? "Tarefa recorrente",
                Description = last?.Description,
                AssigneeId = recurrence.AssigneeId,
                DueDate = dueDateValue,
                Status = "active",
                CreatedBy = recurrence.CreatedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        await m_context.SaveChangesAsync();
    }

    public async System.Threading.Tasks.Task<ApiResponse<TaskResponse>> GetTaskAsync(Guid id, Guid userId)
    {
        m_logger.LogInformation("Fetching task {TaskId} for user {UserId}", id, userId);
        try
        {
            var task = await m_context.Tasks
                .Include(t => t.Assignee)
                .Include(t => t.CompletedByUser)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Recurrence)
                .FirstOrDefaultAsync(t =>
                    t.Id == id && t.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (task == null)
            {
                m_logger.LogWarning("Task {TaskId} not found for user {UserId}", id, userId);
                return ApiResponse<TaskResponse>.ErrorResponse("Not found");
            }

            return ApiResponse<TaskResponse>.SuccessResponse(MapToResponse(task));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error fetching task {TaskId} for user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.ErrorResponse($"Error fetching task: {ex.Message}");
        }
    }

    public async System.Threading.Tasks.Task<ApiResponse<TaskResponse>> CreateTaskAsync(
        CreateTaskRequest request,
        Guid userId
    )
    {
        m_logger.LogInformation(
            "Creating task in household {HouseholdId} by user {UserId}",
            request.HouseholdId, userId
        );
        try
        {
            var hasAccess = await m_context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == request.HouseholdId && hu.UserId == userId
            );
            if (!hasAccess)
            {
                m_logger.LogWarning(
                    "Access denied: user {UserId} attempted to create task in household {HouseholdId}",
                    userId, request.HouseholdId
                );
                return ApiResponse<TaskResponse>.ErrorResponse("Forbidden");
            }

            TaskEntity task;

            if (request.RecurrencePattern == null)
            {
                // Simple task
                DateTime? normalizedDueDate = request.DueDate.HasValue
                    ? DateOnly.FromDateTime(request.DueDate.Value).ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc)
                    : null;

                task = new TaskEntity
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    Title = request.Title,
                    Description = request.Description,
                    AssigneeId = request.AssigneeId,
                    DueDate = normalizedDueDate,
                    Status = "active",
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };

                m_context.Tasks.Add(task);
                await m_context.SaveChangesAsync();
            }
            else
            {
                // Recurring task
                var recurrence = new TaskRecurrence
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    AssigneeId = request.AssigneeId,
                    Pattern = request.RecurrencePattern,
                    RecurrenceDay = request.RecurrenceDay,
                    IsActive = true,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                };

                m_context.TaskRecurrences.Add(recurrence);
                await m_context.SaveChangesAsync();

                var today = TodayInHouseholdTz();
                var firstOccurrence = FirstOccurrenceFrom(today, request.RecurrencePattern, request.RecurrenceDay);
                var dueDate = firstOccurrence.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);

                task = new TaskEntity
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    RecurrenceId = recurrence.Id,
                    Title = request.Title,
                    Description = request.Description,
                    AssigneeId = request.AssigneeId,
                    DueDate = dueDate,
                    Status = "active",
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };

                m_context.Tasks.Add(task);
                await m_context.SaveChangesAsync();
            }

            await m_context.Entry(task).Reference(t => t.Assignee).LoadAsync();
            await m_context.Entry(task).Reference(t => t.CreatedByUser).LoadAsync();
            if (task.RecurrenceId.HasValue)
                await m_context.Entry(task).Reference(t => t.Recurrence).LoadAsync();

            m_logger.LogInformation(
                "Task {TaskId} created in household {HouseholdId} by user {UserId}",
                task.Id, task.HouseholdId, userId
            );
            return ApiResponse<TaskResponse>.SuccessResponse(MapToResponse(task), "Task criada com sucesso");
        }
        catch (Exception ex)
        {
            m_logger.LogError(
                ex,
                "Error creating task in household {HouseholdId} by user {UserId}",
                request.HouseholdId, userId
            );
            return ApiResponse<TaskResponse>.ErrorResponse($"Error creating task: {ex.Message}");
        }
    }

    private static DateOnly FirstOccurrenceFrom(DateOnly from, string pattern, int? recurrenceDay)
    {
        if (pattern == "daily") return from;

        if (pattern == "weekly")
        {
            for (int i = 0; i < 7; i++)
            {
                var candidate = from.AddDays(i);
                int dow = ((int)candidate.DayOfWeek) + 1;
                if (dow == recurrenceDay) return candidate;
            }
            return from;
        }

        if (pattern == "monthly")
        {
            for (int monthOffset = 0; monthOffset < 2; monthOffset++)
            {
                var anchor = from.AddMonths(monthOffset);
                int daysInMonth = DateTime.DaysInMonth(anchor.Year, anchor.Month);
                int targetDay = Math.Min(recurrenceDay!.Value, daysInMonth);
                var candidate = new DateOnly(anchor.Year, anchor.Month, targetDay);
                if (candidate >= from) return candidate;
            }
        }

        return from;
    }

    public async System.Threading.Tasks.Task<ApiResponse<TaskResponse>> UpdateTaskAsync(
        Guid id,
        UpdateTaskRequest request,
        Guid userId
    )
    {
        m_logger.LogInformation("Updating task {TaskId} by user {UserId}", id, userId);
        try
        {
            var task = await m_context.Tasks
                .Include(t => t.Assignee)
                .Include(t => t.CompletedByUser)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Recurrence)
                .FirstOrDefaultAsync(t =>
                    t.Id == id && t.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (task == null)
            {
                m_logger.LogWarning("Task {TaskId} not found for user {UserId}", id, userId);
                return ApiResponse<TaskResponse>.ErrorResponse("Not found");
            }

            if (request.Title != null) task.Title = request.Title;
            if (request.Description != null) task.Description = request.Description;
            if (request.AssigneeId != null) task.AssigneeId = request.AssigneeId;
            if (request.DueDate != null)
                task.DueDate = DateOnly.FromDateTime(request.DueDate.Value).ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);
            task.UpdatedAt = DateTime.UtcNow;

            await m_context.SaveChangesAsync();

            await m_context.Entry(task).Reference(t => t.Assignee).LoadAsync();

            m_logger.LogInformation("Task {TaskId} updated successfully by user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.SuccessResponse(MapToResponse(task));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error updating task {TaskId} for user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.ErrorResponse($"Error updating task: {ex.Message}");
        }
    }

    public async System.Threading.Tasks.Task<ApiResponse<bool>> DeleteTaskAsync(Guid id, Guid userId)
    {
        m_logger.LogInformation("Deleting task {TaskId} by user {UserId}", id, userId);
        try
        {
            var task = await m_context.Tasks
                .Include(t => t.Household)
                .FirstOrDefaultAsync(t =>
                    t.Id == id && t.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (task == null)
            {
                m_logger.LogWarning("Task {TaskId} not found for user {UserId}", id, userId);
                return ApiResponse<bool>.ErrorResponse("Not found");
            }

            m_context.Tasks.Remove(task);
            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Task {TaskId} deleted successfully by user {UserId}", id, userId);
            return ApiResponse<bool>.SuccessResponse(true, "Task eliminada com sucesso");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error deleting task {TaskId} for user {UserId}", id, userId);
            return ApiResponse<bool>.ErrorResponse($"Error deleting task: {ex.Message}");
        }
    }

    public async System.Threading.Tasks.Task<ApiResponse<TaskResponse>> CompleteTaskAsync(Guid id, Guid userId)
    {
        m_logger.LogInformation("Completing task {TaskId} by user {UserId}", id, userId);
        try
        {
            var task = await m_context.Tasks
                .Include(t => t.Assignee)
                .Include(t => t.CompletedByUser)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Recurrence)
                .FirstOrDefaultAsync(t =>
                    t.Id == id && t.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (task == null)
            {
                m_logger.LogWarning("Task {TaskId} not found for user {UserId}", id, userId);
                return ApiResponse<TaskResponse>.ErrorResponse("Not found");
            }

            task.Status = "completed";
            task.CompletedAt = DateTime.UtcNow;
            task.CompletedBy = userId;
            task.UpdatedAt = DateTime.UtcNow;

            await m_context.SaveChangesAsync();

            await m_context.Entry(task).Reference(t => t.CompletedByUser).LoadAsync();

            m_logger.LogInformation("Task {TaskId} completed by user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.SuccessResponse(MapToResponse(task));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error completing task {TaskId} for user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.ErrorResponse($"Error completing task: {ex.Message}");
        }
    }

    public async System.Threading.Tasks.Task<ApiResponse<TaskResponse>> ReopenTaskAsync(Guid id, Guid userId)
    {
        m_logger.LogInformation("Reopening task {TaskId} by user {UserId}", id, userId);
        try
        {
            var task = await m_context.Tasks
                .Include(t => t.Assignee)
                .Include(t => t.CompletedByUser)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Recurrence)
                .FirstOrDefaultAsync(t =>
                    t.Id == id && t.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (task == null)
            {
                m_logger.LogWarning("Task {TaskId} not found for user {UserId}", id, userId);
                return ApiResponse<TaskResponse>.ErrorResponse("Not found");
            }

            task.Status = "active";
            task.CompletedAt = null;
            task.CompletedBy = null;
            task.UpdatedAt = DateTime.UtcNow;

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Task {TaskId} reopened by user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.SuccessResponse(MapToResponse(task));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error reopening task {TaskId} for user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.ErrorResponse($"Error reopening task: {ex.Message}");
        }
    }

    public async System.Threading.Tasks.Task<ApiResponse<TaskRecurrenceResponse>> UpdateRecurrenceAsync(
        Guid recurrenceId,
        UpdateTaskRecurrenceRequest request,
        Guid userId
    )
    {
        m_logger.LogInformation("Updating recurrence {RecurrenceId} by user {UserId}", recurrenceId, userId);
        try
        {
            var recurrence = await m_context.TaskRecurrences
                .Include(r => r.Assignee)
                .FirstOrDefaultAsync(r =>
                    r.Id == recurrenceId &&
                    r.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (recurrence == null)
            {
                m_logger.LogWarning("Recurrence {RecurrenceId} not found for user {UserId}", recurrenceId, userId);
                return ApiResponse<TaskRecurrenceResponse>.ErrorResponse("Not found");
            }

            if (request.AssigneeId != null) recurrence.AssigneeId = request.AssigneeId;
            if (request.IsActive.HasValue) recurrence.IsActive = request.IsActive.Value;

            await m_context.SaveChangesAsync();

            await m_context.Entry(recurrence).Reference(r => r.Assignee).LoadAsync();

            m_logger.LogInformation("Recurrence {RecurrenceId} updated by user {UserId}", recurrenceId, userId);
            return ApiResponse<TaskRecurrenceResponse>.SuccessResponse(MapRecurrenceToResponse(recurrence));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error updating recurrence {RecurrenceId} for user {UserId}", recurrenceId, userId);
            return ApiResponse<TaskRecurrenceResponse>.ErrorResponse($"Error updating recurrence: {ex.Message}");
        }
    }

    public async System.Threading.Tasks.Task<ApiResponse<bool>> DeleteRecurrenceAsync(Guid recurrenceId, Guid userId)
    {
        m_logger.LogInformation("Soft-deleting recurrence {RecurrenceId} by user {UserId}", recurrenceId, userId);
        try
        {
            var recurrence = await m_context.TaskRecurrences
                .FirstOrDefaultAsync(r =>
                    r.Id == recurrenceId &&
                    r.Household.HouseholdUsers.Any(hu => hu.UserId == userId)
                );

            if (recurrence == null)
            {
                m_logger.LogWarning("Recurrence {RecurrenceId} not found for user {UserId}", recurrenceId, userId);
                return ApiResponse<bool>.ErrorResponse("Not found");
            }

            recurrence.IsActive = false;
            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Recurrence {RecurrenceId} deactivated by user {UserId}", recurrenceId, userId);
            return ApiResponse<bool>.SuccessResponse(true, "Recorrência desativada com sucesso");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error deleting recurrence {RecurrenceId} for user {UserId}", recurrenceId, userId);
            return ApiResponse<bool>.ErrorResponse($"Error deleting recurrence: {ex.Message}");
        }
    }

    private static TaskResponse MapToResponse(TaskEntity task) => new()
    {
        Id = task.Id,
        HouseholdId = task.HouseholdId,
        Title = task.Title,
        Description = task.Description,
        AssigneeId = task.AssigneeId,
        AssigneeName = task.Assignee?.Name,
        DueDate = task.DueDate,
        Status = task.Status,
        CompletedAt = task.CompletedAt,
        CompletedBy = task.CompletedBy,
        CompletedByName = task.CompletedByUser?.Name,
        RecurrenceId = task.RecurrenceId,
        RecurrencePattern = task.Recurrence?.Pattern,
        RecurrenceDay = task.Recurrence?.RecurrenceDay,
        CreatedBy = task.CreatedBy,
        CreatedByName = task.CreatedByUser?.Name ?? string.Empty,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt,
    };

    private static TaskRecurrenceResponse MapRecurrenceToResponse(TaskRecurrence recurrence) => new()
    {
        Id = recurrence.Id,
        HouseholdId = recurrence.HouseholdId,
        AssigneeId = recurrence.AssigneeId,
        AssigneeName = recurrence.Assignee?.Name,
        Pattern = recurrence.Pattern,
        RecurrenceDay = recurrence.RecurrenceDay,
        IsActive = recurrence.IsActive,
        CreatedBy = recurrence.CreatedBy,
        CreatedAt = recurrence.CreatedAt,
    };
}
