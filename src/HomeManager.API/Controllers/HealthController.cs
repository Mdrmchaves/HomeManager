using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(
            new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "HomeManager API",
            }
        );
    }

    [HttpGet("error-test")]
    public IActionResult ErrorTest()
    {
        throw new Exception("Global error test!");
    }

    [HttpGet("notfound-test")]
    public IActionResult NotFoundTest()
    {
        throw new KeyNotFoundException("Item not found!");
    }

    [HttpGet("unauthorized-test")]
    public IActionResult UnauthorizedTest()
    {
        throw new UnauthorizedAccessException("You don't have permission!");
    }
}
