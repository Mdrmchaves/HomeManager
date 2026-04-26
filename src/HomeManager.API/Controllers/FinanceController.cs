using System.Security.Claims;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Services.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HomeManager.API.Controllers;

[ApiController]
[Route("api/finance")]
[Authorize]
public class FinanceController : ControllerBase
{
    private readonly IFinanceService m_financeService;

    public FinanceController(IFinanceService financeService)
    {
        m_financeService = financeService;
    }

    private Guid GetUserId()
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
            throw new UnauthorizedAccessException("User ID not found in token");

        return Guid.Parse(userIdClaim);
    }

    // ── Accounts ─────────────────────────────────────────────────────────────

    // GET: api/finance/accounts?householdId={guid}
    [HttpGet("accounts")]
    public async Task<ActionResult<ApiResponse<List<AccountResponse>>>> GetAccounts([FromQuery] Guid householdId)
    {
        var result = await m_financeService.GetAccountsAsync(householdId, GetUserId());
        return result.Success ? Ok(result) : Forbid();
    }

    // POST: api/finance/accounts
    [HttpPost("accounts")]
    public async Task<ActionResult<ApiResponse<AccountResponse>>> CreateAccount(CreateAccountRequest request)
    {
        var result = await m_financeService.CreateAccountAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetAccounts), new { householdId = result.Data!.HouseholdId }, result);
    }

    // PUT: api/finance/accounts/{id}
    [HttpPut("accounts/{id}")]
    public async Task<ActionResult<ApiResponse<AccountResponse>>> UpdateAccount(Guid id, UpdateAccountRequest request)
    {
        var result = await m_financeService.UpdateAccountAsync(id, request, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // DELETE: api/finance/accounts/{id}
    [HttpDelete("accounts/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteAccount(Guid id)
    {
        var result = await m_financeService.DeleteAccountAsync(id, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // POST: api/finance/accounts/{id}/recalculate
    [HttpPost("accounts/{id}/recalculate")]
    public async Task<ActionResult<ApiResponse<AccountResponse>>> RecalculateAccountBalance(Guid id)
    {
        var result = await m_financeService.RecalculateAccountBalanceAsync(id, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // ── Transactions ──────────────────────────────────────────────────────────

    // GET: api/finance/transactions?householdId=&month=&accountId=&type=&category=&page=&pageSize=
    [HttpGet("transactions")]
    public async Task<ActionResult<ApiResponse<PagedResponse<TransactionResponse>>>> GetTransactions(
        [FromQuery] Guid householdId,
        [FromQuery] string? month = null,
        [FromQuery] Guid? accountId = null,
        [FromQuery] string? type = null,
        [FromQuery] string? category = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var result = await m_financeService.GetTransactionsAsync(
            householdId, GetUserId(), month, accountId, type, category, page, pageSize);
        return result.Success ? Ok(result) : Forbid();
    }

    // GET: api/finance/transactions/{id}
    [HttpGet("transactions/{id}")]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> GetTransaction(Guid id)
    {
        var result = await m_financeService.GetTransactionAsync(id, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // POST: api/finance/transactions
    [HttpPost("transactions")]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> CreateTransaction(CreateTransactionRequest request)
    {
        var result = await m_financeService.CreateTransactionAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetTransaction), new { id = result.Data!.Id }, result);
    }

    // PUT: api/finance/transactions/{id}
    [HttpPut("transactions/{id}")]
    public async Task<ActionResult<ApiResponse<TransactionResponse>>> UpdateTransaction(Guid id, UpdateTransactionRequest request)
    {
        var result = await m_financeService.UpdateTransactionAsync(id, request, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // DELETE: api/finance/transactions/{id}
    [HttpDelete("transactions/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteTransaction(Guid id)
    {
        var result = await m_financeService.DeleteTransactionAsync(id, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // POST: api/finance/transactions/import
    [HttpPost("transactions/import")]
    public async Task<ActionResult<ApiResponse<ImportResult>>> ImportTransactions(ImportTransactionsRequest request)
    {
        var result = await m_financeService.ImportTransactionsAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // POST: api/finance/accounts/import
    [HttpPost("accounts/import")]
    public async Task<ActionResult<ApiResponse<ImportResult>>> ImportAccounts(ImportAccountsRequest request)
    {
        var result = await m_financeService.ImportAccountsAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // ── Templates ─────────────────────────────────────────────────────────────

    // GET: api/finance/templates?householdId={guid}
    [HttpGet("templates")]
    public async Task<ActionResult<ApiResponse<List<TemplateResponse>>>> GetTemplates([FromQuery] Guid householdId)
    {
        var result = await m_financeService.GetTemplatesAsync(householdId, GetUserId());
        return result.Success ? Ok(result) : Forbid();
    }

    // POST: api/finance/templates
    [HttpPost("templates")]
    public async Task<ActionResult<ApiResponse<TemplateResponse>>> CreateTemplate(CreateTemplateRequest request)
    {
        var result = await m_financeService.CreateTemplateAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return CreatedAtAction(nameof(GetTemplates), new { householdId = result.Data!.HouseholdId }, result);
    }

    // DELETE: api/finance/templates/{id}
    [HttpDelete("templates/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteTemplate(Guid id)
    {
        var result = await m_financeService.DeleteTemplateAsync(id, GetUserId());
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : NotFound(result);
        return Ok(result);
    }

    // POST: api/finance/templates/apply
    [HttpPost("templates/apply")]
    public async Task<ActionResult<ApiResponse<ApplyResult>>> ApplyTemplates(ApplyTemplatesRequest request)
    {
        var result = await m_financeService.ApplyTemplatesAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // ── Budget ────────────────────────────────────────────────────────────────

    // GET: api/finance/budget?householdId={guid}
    [HttpGet("budget")]
    public async Task<ActionResult<ApiResponse<BudgetResponse>>> GetBudget([FromQuery] Guid householdId)
    {
        var result = await m_financeService.GetBudgetAsync(householdId, GetUserId());
        return result.Success ? Ok(result) : Forbid();
    }

    // PUT: api/finance/budget
    [HttpPut("budget")]
    public async Task<ActionResult<ApiResponse<BudgetResponse>>> UpsertBudget(UpsertBudgetRequest request)
    {
        var result = await m_financeService.UpsertBudgetAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // ── Rates ─────────────────────────────────────────────────────────────────

    // GET: api/finance/rates?householdId={guid}
    [HttpGet("rates")]
    public async Task<ActionResult<ApiResponse<RatesResponse>>> GetRates([FromQuery] Guid householdId)
    {
        var result = await m_financeService.GetRatesAsync(householdId, GetUserId());
        return result.Success ? Ok(result) : Forbid();
    }

    // PUT: api/finance/rates
    [HttpPut("rates")]
    public async Task<ActionResult<ApiResponse<RatesResponse>>> UpsertRates(UpsertRatesRequest request)
    {
        var result = await m_financeService.UpsertRatesAsync(request, GetUserId());
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    // GET: api/finance/dashboard?householdId={guid}&month=YYYY-MM
    [HttpGet("dashboard")]
    public async Task<ActionResult<ApiResponse<DashboardResponse>>> GetDashboard(
        [FromQuery] Guid householdId,
        [FromQuery] string month)
    {
        var result = await m_financeService.GetDashboardAsync(householdId, GetUserId(), month);
        if (!result.Success) return result.Message == "Access denied" ? Forbid() : BadRequest(result);
        return Ok(result);
    }
}
