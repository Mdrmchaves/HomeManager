using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using HomeManager.API.Data;
using HomeManager.API.Services;
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

        // Add more services here as we create them
        // services.AddScoped<IInventoryService, InventoryService>();
        // services.AddScoped<IHouseholdService, HouseholdService>();

        return services;
    }

    public static IServiceCollection AddDatabaseConfiguration(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? throw new InvalidOperationException("Database connection string not configured");

        services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));

        return services;
    }

    public static IServiceCollection AddAuthenticationConfiguration(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var supabaseUrl =
            configuration["Supabase:Url"]
            ?? Environment.GetEnvironmentVariable("SUPABASE_URL")
            ?? throw new InvalidOperationException("Supabase URL not configured");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"{supabaseUrl}/auth/v1";

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = true,
                    ValidIssuer = $"{supabaseUrl}/auth/v1",
                    ValidateAudience = false,
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
                        if (context.Exception.InnerException != null)
                        {
                            Console.WriteLine(
                                $"   Inner: {context.Exception.InnerException.Message}"
                            );
                        }
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        Console.WriteLine("✅ Token validated successfully!");
                        var claims = context.Principal?.Claims.Select(c => $"{c.Type}: {c.Value}");
                        Console.WriteLine(
                            $"📋 Claims: {string.Join(", ", claims ?? Array.Empty<string>())}"
                        );
                        return Task.CompletedTask;
                    },
                    OnMessageReceived = context =>
                    {
                        Console.WriteLine("📨 JWT token received");
                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(
                "AllowAngular",
                policy =>
                    policy
                        .WithOrigins("http://localhost:4200") // Angular dev
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials()
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
