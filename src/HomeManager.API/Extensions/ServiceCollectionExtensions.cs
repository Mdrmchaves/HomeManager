using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using HomeManager.API.Data;
using HomeManager.API.Services;
using HomeManager.API.Services.Finance;
using HomeManager.API.Services.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace HomeManager.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Application Services
        services.AddScoped<IUserSyncService, UserSyncService>();
        services.AddScoped<IHouseholdService, HouseholdService>();
        services.AddScoped<ILocationService, LocationService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IPantryService, PantryService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IFinanceService, FinanceService>();
        services.AddScoped<IPlanningService, PlanningService>();
        services.AddScoped<ITaskService, TaskService>();

        services.AddHttpClient("frankfurter", c =>
        {
            c.BaseAddress = new Uri("https://api.frankfurter.dev");
            c.Timeout = TimeSpan.FromSeconds(5);
        });

        return services;
    }

    public static IServiceCollection AddDatabaseConfiguration(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var connectionString =
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection string not configured");

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql(
                connectionString,
                npgsqlOptions =>
                {
                    npgsqlOptions.CommandTimeout(60);
                }
            );
        });

        return services;
    }

    public static IServiceCollection AddAuthenticationConfiguration(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // FIRST: Try environment variable (Render/Railway use this)
        var supabaseUrl =
            Environment.GetEnvironmentVariable("SUPABASE_URL")
            ?? configuration["Supabase:Url"]
            ?? throw new InvalidOperationException("Supabase URL not configured");

        // Remove trailing slash
        supabaseUrl = supabaseUrl.TrimEnd('/');

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                var issuer = $"{supabaseUrl}/auth/v1";
                Console.WriteLine($"🔧 Configured Issuer: {issuer}");

                options.Authority = issuer;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = "authenticated",
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    RequireSignedTokens = true,
                };

                options.ConfigurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                    $"{supabaseUrl}/auth/v1/.well-known/openid-configuration",
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever()
                );

                options.RequireHttpsMetadata = true;

                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"❌ Auth failed: {context.Exception.Message}");
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        Console.WriteLine("✅ Token validated successfully!");
                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }

    public static IServiceCollection AddCorsConfiguration(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var origins =
            configuration["AllowedOrigins"]?.Split(';', StringSplitOptions.RemoveEmptyEntries)
            ?? new[] { "http://localhost:4200" };

        services.AddCors(options =>
        {
            options.AddPolicy(
                "AllowAngular",
                policy =>
                    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()
            );
        });

        return services;
    }

    public static IServiceCollection AddValidationConfiguration(this IServiceCollection services)
    {
        // Add FluentValidation
        services.AddValidatorsFromAssemblyContaining<Program>();

        services.AddFluentValidationAutoValidation(config =>
        {
            config.DisableDataAnnotationsValidation = true;
        });

        return services;
    }

    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc(
                "v1",
                new OpenApiInfo
                {
                    Title = "HomeManager API",
                    Version = "v1",
                    Description = "API for managing household inventory and items",
                    Contact = new OpenApiContact
                    {
                        Name = "HomeManager Team",
                        Email = "support@homemanager.com",
                    },
                }
            );

            // JWT Authentication
            options.AddSecurityDefinition(
                "Bearer",
                new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your JWT token from Supabase",
                }
            );

            options.AddSecurityRequirement(
                new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer",
                            },
                        },
                        Array.Empty<string>()
                    },
                }
            );
        });

        return services;
    }
}
