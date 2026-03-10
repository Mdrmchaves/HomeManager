using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace HomeManager.API.Data;

/// <summary>
/// Design-time factory used by EF Core tooling (dotnet ef migrations).
/// Reads the connection string from appsettings.Development.json or the
/// DATABASE_URL environment variable so migrations can be generated without
/// starting the full application host.
/// </summary>
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .AddUserSecrets<ApplicationDbContextFactory>(optional: true)
            .Build();

        var connectionString =
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "No connection string found. Set DefaultConnection in appsettings.Development.json "
                    + "or the DATABASE_URL environment variable."
            );

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql(connectionString, npgsqlOptions =>
        {
            npgsqlOptions.CommandTimeout(60);
        });

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
