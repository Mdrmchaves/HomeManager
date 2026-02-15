using HomeManager.API.Extensions;
using HomeManager.API.Middleware;
using Serilog;

// ========================================
// Configure Serilog
// ========================================
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
    )
    .WriteTo.File(
        path: "logs/homemanager-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
    )
    .CreateLogger();

try
{
    Log.Information("Starting HomeManager API...");

    var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
    builder.WebHost.UseUrls($"http://*:{port}");

    var builder = WebApplication.CreateBuilder(args);

    // Use Serilog for logging
    builder.Host.UseSerilog();

    // ========================================
    // Configure Services
    // ========================================

    // Database
    builder.Services.AddDatabaseConfiguration(builder.Configuration);

    // CORS
    builder.Services.AddCorsConfiguration();

    // Authentication & Authorization
    builder.Services.AddAuthenticationConfiguration(builder.Configuration);

    // Application Services
    builder.Services.AddApplicationServices();

    // Validation
    builder.Services.AddValidationConfiguration();

    // Framework Services
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerConfiguration();

    // ========================================
    // Configure Middleware Pipeline
    // ========================================

    var app = builder.Build();

    // Serilog request logging
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set(
                "UserAgent",
                httpContext.Request.Headers["User-Agent"].ToString()
            );
        };
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // Global Error Handling
    app.UseMiddleware<ErrorHandlingMiddleware>();

    // CORS
    app.UseCors("AllowAngular");

    // Authentication
    app.UseAuthentication();

    // User Sync (must be after Authentication)
    app.UseMiddleware<UserSyncMiddleware>();

    // Authorization
    app.UseAuthorization();

    // Controllers
    app.MapControllers();

    Log.Information(
        "HomeManager API started successfully on {Environment}",
        app.Environment.EnvironmentName
    );

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
