using System.Net;
using System.Text.Json;
using FluentValidation;
using HomeManager.API.Models;

namespace HomeManager.API.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };

        // Handle FluentValidation errors
        if (exception is ValidationException validationException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

            var validationErrors = validationException
                .Errors.GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

            var validationResponse = new ValidationErrorResponse
            {
                Message = "Validation failed",
                Errors = validationErrors,
                Timestamp = DateTime.UtcNow,
            };

            var json = JsonSerializer.Serialize(validationResponse, options);
            await context.Response.WriteAsync(json);
            return;
        }

        // Handle other exceptions
        var response = exception switch
        {
            ApplicationException _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Message = exception.Message,
                Details = exception.StackTrace,
            },
            KeyNotFoundException _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.NotFound,
                Message = exception.Message,
                Details = "Resource not found",
            },
            UnauthorizedAccessException _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.Unauthorized,
                Message = "Unauthorized access",
                Details = exception.Message,
            },
            _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.InternalServerError,
                Message = "Internal server error",
                Details = exception.Message,
            },
        };

        context.Response.StatusCode = response.StatusCode;
        var errorJson = JsonSerializer.Serialize(response, options);
        await context.Response.WriteAsync(errorJson);
    }
}

public class ErrorResponse
{
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
