using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using Microsoft.EntityFrameworkCore;
using TaskEntity = HomeManager.API.Models.Tasks.Task;

namespace HomeManager.API.Services.Tasks;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext m_context;
    private readonly ILogger<TaskService> m_logger;

    public TaskService(ApplicationDbContext context, ILogger<TaskService> logger)
    {
        m_context = context;
        m_logger = logger;
    }

    public async System.Threading.Tasks.Task<ApiResponse<PagedResponse<TaskResponse>>> GetTasksAsync(
        Guid householdId,
        Guid userId,
        string? status,
        int page,
        int pageSize
    )
    {
        m_logger.LogInformation(
            "Fetching tasks for household {HouseholdId} by user {UserId}",
            householdId,
            userId
        );
        try
        {
            var hasAccess = await m_context.HouseholdUsers.AnyAsync(hu =>
                hu.HouseholdId == householdId && hu.UserId == userId
            );
            if (!hasAccess)
                return ApiResponse<PagedResponse<TaskResponse>>.ErrorResponse("Forbidden");

            var query = m_context.Tasks
                .Include(t => t.Assignee)
                .Include(t => t.CompletedByUser)
                .Include(t => t.CreatedByUser)
                .Where(t => t.HouseholdId == householdId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(t => t.Status == status);

            var total = await query.CountAsync();

            var now = DateTime.UtcNow;
            var items = await query
                .OrderBy(t =>
                    t.DueDate == null ? 2
                    : t.DueDate.Value < now ? 0
                    : 1
                )
                .ThenBy(t => t.DueDate)
                .ThenByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var paged = new PagedResponse<TaskResponse>
            {
                Items = items.Select(MapToResponse).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize,
                HasMore = (page * pageSize) < total,
            };

            m_logger.LogInformation(
                "Fetched {Count}/{Total} tasks (page {Page}) for household {HouseholdId}",
                items.Count,
                total,
                page,
                householdId
            );
            return ApiResponse<PagedResponse<TaskResponse>>.SuccessResponse(paged);
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error fetching tasks for household {HouseholdId}", householdId);
            return ApiResponse<PagedResponse<TaskResponse>>.ErrorResponse(
                $"Error fetching tasks: {ex.Message}"
            );
        }
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
            request.HouseholdId,
            userId
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
                    userId,
                    request.HouseholdId
                );
                return ApiResponse<TaskResponse>.ErrorResponse("Forbidden");
            }

            var task = new TaskEntity
            {
                Id = Guid.NewGuid(),
                HouseholdId = request.HouseholdId,
                Title = request.Title,
                Description = request.Description,
                AssigneeId = request.AssigneeId,
                DueDate = request.DueDate,
                Status = "active",
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            m_context.Tasks.Add(task);
            await m_context.SaveChangesAsync();

            await m_context.Entry(task).Reference(t => t.Assignee).LoadAsync();
            await m_context.Entry(task).Reference(t => t.CreatedByUser).LoadAsync();

            m_logger.LogInformation(
                "Task {TaskId} created in household {HouseholdId} by user {UserId}",
                task.Id,
                task.HouseholdId,
                userId
            );
            return ApiResponse<TaskResponse>.SuccessResponse(
                MapToResponse(task),
                "Task criada com sucesso"
            );
        }
        catch (Exception ex)
        {
            m_logger.LogError(
                ex,
                "Error creating task in household {HouseholdId} by user {UserId}",
                request.HouseholdId,
                userId
            );
            return ApiResponse<TaskResponse>.ErrorResponse($"Error creating task: {ex.Message}");
        }
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
            if (request.DueDate != null) task.DueDate = request.DueDate;
            task.UpdatedAt = DateTime.UtcNow;

            await m_context.SaveChangesAsync();

            await m_context.Entry(task).Reference(t => t.Assignee).LoadAsync();

            m_logger.LogInformation(
                "Task {TaskId} updated successfully by user {UserId}",
                id,
                userId
            );
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

            m_logger.LogInformation(
                "Task {TaskId} deleted successfully by user {UserId}",
                id,
                userId
            );
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

            m_logger.LogInformation(
                "Task {TaskId} completed by user {UserId}",
                id,
                userId
            );
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

            m_logger.LogInformation(
                "Task {TaskId} reopened by user {UserId}",
                id,
                userId
            );
            return ApiResponse<TaskResponse>.SuccessResponse(MapToResponse(task));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error reopening task {TaskId} for user {UserId}", id, userId);
            return ApiResponse<TaskResponse>.ErrorResponse($"Error reopening task: {ex.Message}");
        }
    }

    private static TaskResponse MapToResponse(TaskEntity task) => new TaskResponse
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
        CreatedBy = task.CreatedBy,
        CreatedByName = task.CreatedByUser?.Name ?? string.Empty,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt,
    };
}
