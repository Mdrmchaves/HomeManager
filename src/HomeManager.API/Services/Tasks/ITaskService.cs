using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services.Tasks;

public interface ITaskService
{
    System.Threading.Tasks.Task<ApiResponse<List<TaskResponse>>> GetTasksByDateAsync(
        Guid householdId,
        Guid userId,
        DateOnly date
    );

    System.Threading.Tasks.Task<ApiResponse<TaskResponse>> GetTaskAsync(Guid id, Guid userId);

    System.Threading.Tasks.Task<ApiResponse<TaskResponse>> CreateTaskAsync(CreateTaskRequest request, Guid userId);

    System.Threading.Tasks.Task<ApiResponse<TaskResponse>> UpdateTaskAsync(Guid id, UpdateTaskRequest request, Guid userId);

    System.Threading.Tasks.Task<ApiResponse<bool>> DeleteTaskAsync(Guid id, Guid userId);

    System.Threading.Tasks.Task<ApiResponse<TaskResponse>> CompleteTaskAsync(Guid id, Guid userId);

    System.Threading.Tasks.Task<ApiResponse<TaskResponse>> ReopenTaskAsync(Guid id, Guid userId);

    System.Threading.Tasks.Task<ApiResponse<TaskRecurrenceResponse>> UpdateRecurrenceAsync(
        Guid recurrenceId,
        UpdateTaskRecurrenceRequest request,
        Guid userId
    );

    System.Threading.Tasks.Task<ApiResponse<bool>> DeleteRecurrenceAsync(Guid recurrenceId, Guid userId);
}
