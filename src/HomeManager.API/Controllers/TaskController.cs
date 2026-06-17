using System.Security.Claims;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Services.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TaskController : ControllerBase
{
    private readonly ITaskService m_taskService;

    public TaskController(ITaskService taskService)
    {
        m_taskService = taskService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // GET: api/tasks?householdId={guid}&status={string}&page={int}&pageSize={int}
    [HttpGet]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<PagedResponse<TaskResponse>>>> GetTasks(
        [FromQuery] Guid? householdId = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30
    )
    {
        if (!householdId.HasValue)
            return BadRequest(ApiResponse<PagedResponse<TaskResponse>>.ErrorResponse(
                "O parâmetro householdId é obrigatório"
            ));

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var result = await m_taskService.GetTasksAsync(
            householdId.Value,
            GetUserId(),
            status,
            page,
            pageSize
        );

        if (!result.Success)
        {
            if (result.Message == "Forbidden")
                return Forbid();
            return StatusCode(500, result);
        }

        return Ok(result);
    }

    // GET: api/tasks/{id}
    [HttpGet("{id}")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskResponse>>> GetTask(Guid id)
    {
        var result = await m_taskService.GetTaskAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }

    // POST: api/tasks
    [HttpPost]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskResponse>>> CreateTask(
        CreateTaskRequest request
    )
    {
        var result = await m_taskService.CreateTaskAsync(request, GetUserId());

        if (!result.Success)
        {
            if (result.Message == "Forbidden")
                return Forbid();
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetTask), new { id = result.Data!.Id }, result);
    }

    // PUT: api/tasks/{id}
    [HttpPut("{id}")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskResponse>>> UpdateTask(
        Guid id,
        UpdateTaskRequest request
    )
    {
        var result = await m_taskService.UpdateTaskAsync(id, request, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }

    // DELETE: api/tasks/{id}
    [HttpDelete("{id}")]
    public async System.Threading.Tasks.Task<IActionResult> DeleteTask(Guid id)
    {
        var result = await m_taskService.DeleteTaskAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return NoContent();
    }

    // POST: api/tasks/{id}/complete
    [HttpPost("{id}/complete")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskResponse>>> CompleteTask(Guid id)
    {
        var result = await m_taskService.CompleteTaskAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }

    // POST: api/tasks/{id}/reopen
    [HttpPost("{id}/reopen")]
    public async System.Threading.Tasks.Task<ActionResult<ApiResponse<TaskResponse>>> ReopenTask(Guid id)
    {
        var result = await m_taskService.ReopenTaskAsync(id, GetUserId());

        if (!result.Success)
            return NotFound();

        return Ok(result);
    }
}
