using System.Net.Http.Json;
using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Finance;
using Microsoft.EntityFrameworkCore;
using TaskEntity = HomeManager.API.Models.Tasks.Task;
using TaskRecurrence = HomeManager.API.Models.Tasks.TaskRecurrence;

namespace HomeManager.API.Services.Finance;

public class FinanceService : IFinanceService
{
    private readonly ILogger<FinanceService> m_logger;
    private readonly ApplicationDbContext m_context;
    private readonly IHttpClientFactory m_httpClientFactory;

    private static readonly string[] ValidCategories = ["lf", "cf", "co", "mt", "pr", "es"];
    private static readonly string[] KnownCurrencies = ["BRL", "EUR", "USD", "PYG"];

    private record FrankfurterRates(
        [property: System.Text.Json.Serialization.JsonPropertyName("rates")]
        Dictionary<string, decimal> Rates
    );

    public FinanceService(ILogger<FinanceService> logger, ApplicationDbContext context, IHttpClientFactory httpClientFactory)
    {
        m_logger = logger;
        m_context = context;
        m_httpClientFactory = httpClientFactory;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private async Task<bool> HasAccessAsync(Guid householdId, Guid userId) =>
        await m_context.HouseholdUsers
            .AnyAsync(hu => hu.HouseholdId == householdId && hu.UserId == userId);

    private static string CalcRefMonth(DateOnly date, FinanceAccount? account)
    {
        if (account is null || account.Type != "cc" || account.CloseDay is null)
            return $"{date.Year:D4}-{date.Month:D2}";

        if (account.CloseMonthIsNext)
        {
            // Close day is in the following month (e.g. closes on 2nd of next month).
            // Transactions on or before closeDay belong to the PREVIOUS month's invoice.
            // e.g. closeDay=2: Apr 18 → Apr invoice; May 1 → Apr invoice; May 3 → May invoice.
            if (date.Day <= account.CloseDay)
            {
                var prev = date.AddMonths(-1);
                return $"{prev.Year:D4}-{prev.Month:D2}";
            }
            return $"{date.Year:D4}-{date.Month:D2}";
        }
        else
        {
            // Close day is in the same month (standard model).
            // Transactions AFTER closeDay belong to the NEXT month's invoice.
            // e.g. closeDay=10: Apr 11 → May invoice; Apr 10 → Apr invoice.
            if (date.Day > account.CloseDay)
            {
                var next = date.AddMonths(1);
                return $"{next.Year:D4}-{next.Month:D2}";
            }
            return $"{date.Year:D4}-{date.Month:D2}";
        }
    }

    private static decimal ToBase(decimal amount, string currency, Dictionary<string, decimal> rates)
    {
        var rate = rates.TryGetValue(currency, out var r) ? r : 1m;
        return rate == 0 ? amount : amount * rate;
    }

    // Returns "1 unit of currency = X units of baseCurrency" on the given date.
    // Returns null when the currency is unsupported or Frankfurter is unavailable.
    private async Task<decimal?> FetchHistoricalRateAsync(DateOnly date, string currency, string baseCurrency)
    {
        if (currency == baseCurrency) return 1m;
        try
        {
            var client = m_httpClientFactory.CreateClient("frankfurter");
            var result = await client.GetFromJsonAsync<FrankfurterRates>(
                $"/v1/{date:yyyy-MM-dd}?base={currency}&symbols={baseCurrency}");
            return result?.Rates.TryGetValue(baseCurrency, out var rate) == true ? rate : null;
        }
        catch (Exception ex)
        {
            m_logger.LogWarning(ex, "Frankfurter historical rate unavailable for {Currency} on {Date}", currency, date);
            return null;
        }
    }

    // Returns a rates dict { currency → how many baseCurrency per 1 unit } using today's Frankfurter rates.
    // Falls back to dbFallback for any currency Frankfurter can't provide (or on error).
    private async Task<Dictionary<string, decimal>> FetchTodayRatesAsync(string baseCurrency, Dictionary<string, decimal> dbFallback)
    {
        try
        {
            var symbols = KnownCurrencies.Where(c => c != baseCurrency).ToArray();
            var client = m_httpClientFactory.CreateClient("frankfurter");
            // Frankfurter returns: 1 baseCurrency = X foreignCurrency → invert to get 1 foreign = Y baseCurrency
            var result = await client.GetFromJsonAsync<FrankfurterRates>(
                $"/v1/latest?base={baseCurrency}&symbols={string.Join(",", symbols)}");

            if (result is null) return dbFallback;

            var rates = new Dictionary<string, decimal> { [baseCurrency] = 1m };
            foreach (var (sym, rate) in result.Rates)
                if (rate != 0) rates[sym] = Math.Round(1m / rate, 6);

            foreach (var (sym, rate) in dbFallback)
                if (!rates.ContainsKey(sym)) rates[sym] = rate;

            return rates;
        }
        catch (Exception ex)
        {
            m_logger.LogWarning(ex, "Frankfurter today's rates unavailable, using DB fallback");
            return dbFallback;
        }
    }

    /// <summary>
    /// Adjusts account balances for a transaction.
    /// sign = +1 to apply the effect, -1 to reverse it.
    /// </summary>
    private async Task AdjustAccountBalancesAsync(
        string type, Guid? accountId, decimal amount,
        Guid? toAccountId, decimal? toAmount, int sign)
    {
        if (type == "transfer")
        {
            if (accountId.HasValue)
            {
                var from = await m_context.FinanceAccounts.FindAsync(accountId.Value);
                if (from is not null) from.Balance = (from.Balance ?? 0m) - sign * amount;
            }
            if (toAccountId.HasValue)
            {
                var to = await m_context.FinanceAccounts.FindAsync(toAccountId.Value);
                if (to is not null) to.Balance = (to.Balance ?? 0m) + sign * (toAmount ?? amount);
            }
        }
        else if (accountId.HasValue)
        {
            var account = await m_context.FinanceAccounts.FindAsync(accountId.Value);
            if (account is not null)
                account.Balance = (account.Balance ?? 0m) + sign * (type == "income" ? amount : -amount);
        }
    }

    // ── Accounts ─────────────────────────────────────────────────────────────

    public async Task<ApiResponse<List<AccountResponse>>> GetAccountsAsync(Guid householdId, Guid userId, string? month = null, bool includeInactive = false)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<List<AccountResponse>>.ErrorResponse("Access denied");

            var query = m_context.FinanceAccounts.Where(a => a.HouseholdId == householdId);
            if (!includeInactive) query = query.Where(a => a.IsActive);

            var accounts = await query.OrderBy(a => a.Name).ToListAsync();

            // Compute currentInvoice for CC accounts when month is provided
            Dictionary<Guid, decimal> invoiceByAccount = [];
            if (!string.IsNullOrEmpty(month))
            {
                var ccIds = accounts.Where(a => a.Type == "cc").Select(a => a.Id).ToHashSet();
                if (ccIds.Count > 0)
                {
                    invoiceByAccount = await m_context.FinanceTransactions
                        .Where(tx => ccIds.Contains(tx.AccountId ?? Guid.Empty)
                                  && tx.RefMonth == month
                                  && tx.Type == "expense")
                        .GroupBy(tx => tx.AccountId!.Value)
                        .Select(g => new { AccountId = g.Key, Total = g.Sum(tx => tx.Amount) })
                        .ToDictionaryAsync(x => x.AccountId, x => x.Total);
                }
            }

            var responses = accounts.Select(a =>
            {
                invoiceByAccount.TryGetValue(a.Id, out var invoice);
                return AccountResponse.FromEntity(a, a.Type == "cc" && !string.IsNullOrEmpty(month) ? invoice : null);
            }).ToList();

            return ApiResponse<List<AccountResponse>>.SuccessResponse(responses);
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting accounts for household {HouseholdId}", householdId);
            return ApiResponse<List<AccountResponse>>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<AccountResponse>> CreateAccountAsync(CreateAccountRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<AccountResponse>.ErrorResponse("Access denied");

            var account = new FinanceAccount
            {
                Id = Guid.NewGuid(),
                HouseholdId = request.HouseholdId,
                OwnerId = userId,
                Name = request.Name,
                Currency = request.Currency,
                Type = request.Type,
                CloseDay = request.CloseDay,
                CloseMonthIsNext = request.CloseMonthIsNext,
                DueDay = request.DueDay,
                Limit = request.Limit,
                Balance = request.Balance,
                CreatedAt = DateTime.UtcNow,
            };

            m_context.FinanceAccounts.Add(account);

            if (request.Type == "cc" && request.DueDay.HasValue)
            {
                var recurrenceId = await CreateCcPaymentRecurrenceAsync(
                    householdId: request.HouseholdId,
                    userId: userId,
                    dueDay: request.DueDay.Value,
                    accountName: request.Name
                );
                account.TaskRecurrenceId = recurrenceId;
            }

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Account {AccountId} created for household {HouseholdId}", account.Id, request.HouseholdId);
            return ApiResponse<AccountResponse>.SuccessResponse(AccountResponse.FromEntity(account), "Account created");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error creating account for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<AccountResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<AccountResponse>> UpdateAccountAsync(Guid id, UpdateAccountRequest request, Guid userId)
    {
        try
        {
            var account = await m_context.FinanceAccounts.FindAsync(id);
            if (account is null)
                return ApiResponse<AccountResponse>.ErrorResponse("Account not found");

            if (!await HasAccessAsync(account.HouseholdId, userId))
                return ApiResponse<AccountResponse>.ErrorResponse("Access denied");

            bool wasCC = account.Type == "cc";
            bool nameChanged = request.Name is not null && request.Name != account.Name;
            bool dueDayChanged = request.DueDay.HasValue && request.DueDay != account.DueDay;
            bool deactivating = request.IsActive.HasValue && !request.IsActive.Value && account.IsActive;
            bool reactivating = request.IsActive.HasValue && request.IsActive.Value && !account.IsActive;

            if (request.Name is not null) account.Name = request.Name;
            if (request.Currency is not null) account.Currency = request.Currency;
            if (request.Type is not null) account.Type = request.Type;
            if (request.CloseDay.HasValue) account.CloseDay = request.CloseDay;
            if (request.CloseMonthIsNext.HasValue) account.CloseMonthIsNext = request.CloseMonthIsNext.Value;
            if (request.DueDay.HasValue) account.DueDay = request.DueDay;
            if (request.Limit.HasValue) account.Limit = request.Limit;
            if (request.Balance.HasValue) account.Balance = request.Balance;
            if (request.IsActive.HasValue) account.IsActive = request.IsActive.Value;

            bool isCC = account.Type == "cc";

            // Sync task recurrence
            if (account.TaskRecurrenceId.HasValue)
            {
                var recurrence = await m_context.TaskRecurrences.FindAsync(account.TaskRecurrenceId.Value);
                if (recurrence != null)
                {
                    if (deactivating || !isCC)
                    {
                        recurrence.IsActive = false;
                        if (!isCC) account.TaskRecurrenceId = null;
                    }
                    else
                    {
                        if (reactivating) recurrence.IsActive = true;
                        if (dueDayChanged) recurrence.RecurrenceDay = request.DueDay;
                        if (nameChanged)
                        {
                            var newTitle = $"Pagar fatura: {account.Name}";
                            await UpdateFutureCcTaskTitlesAsync(recurrence.Id, newTitle);
                        }
                    }
                }
            }
            else if (isCC && account.IsActive && account.DueDay.HasValue)
            {
                // CC que não tinha DueDay agora tem (ou passou de non-CC para CC)
                var recurrenceId = await CreateCcPaymentRecurrenceAsync(
                    householdId: account.HouseholdId,
                    userId: userId,
                    dueDay: account.DueDay.Value,
                    accountName: account.Name
                );
                account.TaskRecurrenceId = recurrenceId;
            }

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Account {AccountId} updated", id);
            return ApiResponse<AccountResponse>.SuccessResponse(AccountResponse.FromEntity(account), "Account updated");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error updating account {AccountId}", id);
            return ApiResponse<AccountResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteAccountAsync(Guid id, Guid userId)
    {
        try
        {
            var account = await m_context.FinanceAccounts.FindAsync(id);
            if (account is null)
                return ApiResponse<bool>.ErrorResponse("Account not found");

            if (!await HasAccessAsync(account.HouseholdId, userId))
                return ApiResponse<bool>.ErrorResponse("Access denied");

            if (account.TaskRecurrenceId.HasValue)
            {
                var recurrence = await m_context.TaskRecurrences.FindAsync(account.TaskRecurrenceId.Value);
                if (recurrence != null)
                    recurrence.IsActive = false;
            }

            m_context.FinanceAccounts.Remove(account);
            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Account {AccountId} deleted", id);
            return ApiResponse<bool>.SuccessResponse(true, "Account deleted");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error deleting account {AccountId}", id);
            return ApiResponse<bool>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<AccountResponse>> RecalculateAccountBalanceAsync(Guid accountId, Guid userId)
    {
        try
        {
            var account = await m_context.FinanceAccounts.FindAsync(accountId);
            if (account is null)
                return ApiResponse<AccountResponse>.ErrorResponse("Account not found");

            if (!await HasAccessAsync(account.HouseholdId, userId))
                return ApiResponse<AccountResponse>.ErrorResponse("Access denied");

            var income = await m_context.FinanceTransactions
                .Where(tx => tx.AccountId == accountId && tx.Type == "income")
                .SumAsync(tx => (decimal?)tx.Amount) ?? 0m;

            var expenses = await m_context.FinanceTransactions
                .Where(tx => tx.AccountId == accountId && tx.Type == "expense")
                .SumAsync(tx => (decimal?)tx.Amount) ?? 0m;

            var transfersOut = await m_context.FinanceTransactions
                .Where(tx => tx.AccountId == accountId && tx.Type == "transfer")
                .SumAsync(tx => (decimal?)tx.Amount) ?? 0m;

            var transfersIn = await m_context.FinanceTransactions
                .Where(tx => tx.ToAccountId == accountId && tx.Type == "transfer")
                .SumAsync(tx => (decimal?)(tx.ToAmount ?? tx.Amount)) ?? 0m;

            account.Balance = income - expenses - transfersOut + transfersIn;
            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Balance recalculated for account {AccountId}: {Balance}", accountId, account.Balance);
            return ApiResponse<AccountResponse>.SuccessResponse(AccountResponse.FromEntity(account), "Balance recalculated");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error recalculating balance for account {AccountId}", accountId);
            return ApiResponse<AccountResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    // ── Transactions ──────────────────────────────────────────────────────────

    public async Task<ApiResponse<PagedResponse<TransactionResponse>>> GetTransactionsAsync(
        Guid householdId, Guid userId,
        string? month, Guid? accountId, string? type, string? category,
        int page, int pageSize)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<PagedResponse<TransactionResponse>>.ErrorResponse("Access denied");

            var query = m_context.FinanceTransactions
                .Include(tx => tx.Account)
                .Include(tx => tx.ToAccount)
                .Where(tx => tx.HouseholdId == householdId)
                .AsQueryable();

            if (!string.IsNullOrEmpty(month))
                query = query.Where(tx => tx.RefMonth == month);

            if (accountId.HasValue)
                query = query.Where(tx => tx.AccountId == accountId);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(tx => tx.Type == type);

            if (!string.IsNullOrEmpty(category))
                query = query.Where(tx => tx.Category == category);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(tx => tx.Date)
                .ThenByDescending(tx => tx.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var paged = new PagedResponse<TransactionResponse>
            {
                Items = items.Select(TransactionResponse.FromEntity).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize,
                HasMore = (page * pageSize) < total,
            };

            return ApiResponse<PagedResponse<TransactionResponse>>.SuccessResponse(paged);
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting transactions for household {HouseholdId}", householdId);
            return ApiResponse<PagedResponse<TransactionResponse>>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<TransactionResponse>> GetTransactionAsync(Guid id, Guid userId)
    {
        try
        {
            var tx = await m_context.FinanceTransactions
                .Include(t => t.Account)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tx is null)
                return ApiResponse<TransactionResponse>.ErrorResponse("Transaction not found");

            if (!await HasAccessAsync(tx.HouseholdId, userId))
                return ApiResponse<TransactionResponse>.ErrorResponse("Access denied");

            return ApiResponse<TransactionResponse>.SuccessResponse(TransactionResponse.FromEntity(tx));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting transaction {TransactionId}", id);
            return ApiResponse<TransactionResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<TransactionResponse>> CreateTransactionAsync(CreateTransactionRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<TransactionResponse>.ErrorResponse("Access denied");

            FinanceAccount? account = null;
            if (request.AccountId.HasValue)
            {
                account = await m_context.FinanceAccounts.FindAsync(request.AccountId.Value);
                if (account is null || account.HouseholdId != request.HouseholdId)
                    return ApiResponse<TransactionResponse>.ErrorResponse("Account not found");
            }

            FinanceAccount? toAccount = null;
            if (request.Type == "transfer" && request.ToAccountId.HasValue)
            {
                toAccount = await m_context.FinanceAccounts.FindAsync(request.ToAccountId.Value);
                if (toAccount is null || toAccount.HouseholdId != request.HouseholdId)
                    return ApiResponse<TransactionResponse>.ErrorResponse("Destination account not found");
            }

            var refMonth = !string.IsNullOrEmpty(request.RefMonth)
                ? request.RefMonth
                : CalcRefMonth(request.Date, account);

            var household = await m_context.Households.FindAsync(request.HouseholdId);
            var defaultCurrency = household?.DefaultCurrency ?? "BRL";

            var tx = new FinanceTransaction
            {
                Id = Guid.NewGuid(),
                HouseholdId = request.HouseholdId,
                CreatedBy = userId,
                AccountId = request.AccountId,
                Description = request.Description,
                Amount = request.Amount,
                Currency = request.Currency,
                Date = request.Date,
                RefMonth = refMonth,
                Type = request.Type,
                Category = request.Type == "income" ? null : request.Category,
                ToAccountId = request.Type == "transfer" ? request.ToAccountId : null,
                ToAmount = request.Type == "transfer" ? (request.ToAmount ?? request.Amount) : null,
                AppliedRate = await FetchHistoricalRateAsync(request.Date, request.Currency, defaultCurrency),
                CreatedAt = DateTime.UtcNow,
            };

            tx.PlanningItemId = request.PlanningItemId;
            m_context.FinanceTransactions.Add(tx);
            await AdjustAccountBalancesAsync(tx.Type, tx.AccountId, tx.Amount, tx.ToAccountId, tx.ToAmount, +1);

            if (request.PlanningItemId.HasValue)
            {
                var planningItem = await m_context.FinancePlanningItems.FindAsync(request.PlanningItemId.Value);
                if (planningItem is { Type: "installment" })
                {
                    planningItem.InstallmentsPaid++;
                    if (planningItem.InstallmentsPaid >= (planningItem.TotalInstallments ?? int.MaxValue))
                        planningItem.IsActive = false;
                }
            }

            await m_context.SaveChangesAsync();

            tx.Account = account;
            tx.ToAccount = toAccount;
            m_logger.LogInformation("Transaction {TransactionId} created for household {HouseholdId}", tx.Id, request.HouseholdId);
            return ApiResponse<TransactionResponse>.SuccessResponse(TransactionResponse.FromEntity(tx), "Transaction created");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error creating transaction for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<TransactionResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<TransactionResponse>> UpdateTransactionAsync(Guid id, UpdateTransactionRequest request, Guid userId)
    {
        try
        {
            var tx = await m_context.FinanceTransactions
                .Include(t => t.Account)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tx is null)
                return ApiResponse<TransactionResponse>.ErrorResponse("Transaction not found");

            if (!await HasAccessAsync(tx.HouseholdId, userId))
                return ApiResponse<TransactionResponse>.ErrorResponse("Access denied");

            // Capture old values before mutation
            var oldAccountId = tx.AccountId;
            var oldToAccountId = tx.ToAccountId;
            var oldAmount = tx.Amount;
            var oldToAmount = tx.ToAmount;
            var oldType = tx.Type;
            var oldPlanningItemId = tx.PlanningItemId;

            if (request.AccountId.HasValue) tx.AccountId = request.AccountId;
            if (request.Description is not null) tx.Description = request.Description;
            if (request.Amount.HasValue) tx.Amount = request.Amount.Value;
            if (request.Currency is not null) tx.Currency = request.Currency;
            if (request.Date.HasValue) tx.Date = request.Date.Value;
            if (request.Type is not null)
            {
                tx.Type = request.Type;
                // Changing away from transfer: clear transfer fields
                if (request.Type != "transfer") { tx.ToAccountId = null; tx.ToAmount = null; }
            }
            if (request.Category is not null) tx.Category = tx.Type == "income" ? null : request.Category;
            if (tx.Type == "transfer")
            {
                if (request.ToAccountId.HasValue) tx.ToAccountId = request.ToAccountId;
                if (request.ToAmount.HasValue) tx.ToAmount = request.ToAmount;
                // Default toAmount = amount if not set
                tx.ToAmount ??= tx.Amount;
            }

            // Recompute refMonth if date or account changed and no explicit override
            if ((request.Date.HasValue || request.AccountId.HasValue) && string.IsNullOrEmpty(request.RefMonth))
            {
                var account = tx.AccountId.HasValue
                    ? await m_context.FinanceAccounts.FindAsync(tx.AccountId.Value)
                    : null;
                tx.RefMonth = CalcRefMonth(tx.Date, account);
            }
            else if (!string.IsNullOrEmpty(request.RefMonth))
            {
                tx.RefMonth = request.RefMonth;
            }

            // Re-fetch rate snapshot if date or currency changed
            if (request.Date.HasValue || request.Currency is not null)
            {
                var household = await m_context.Households.FindAsync(tx.HouseholdId);
                var defaultCurrency = household?.DefaultCurrency ?? "BRL";
                tx.AppliedRate = await FetchHistoricalRateAsync(tx.Date, tx.Currency, defaultCurrency);
            }

            bool planningLinkChanged = request.ClearPlanningItemId || request.PlanningItemId.HasValue;
            Guid? newPlanningItemId = request.ClearPlanningItemId ? null : request.PlanningItemId;

            if (planningLinkChanged && oldPlanningItemId != newPlanningItemId)
            {
                if (oldPlanningItemId.HasValue)
                {
                    var oldItem = await m_context.FinancePlanningItems.FindAsync(oldPlanningItemId.Value);
                    if (oldItem is { Type: "installment" })
                    {
                        oldItem.InstallmentsPaid = Math.Max(0, oldItem.InstallmentsPaid - 1);
                        if (!oldItem.IsActive && oldItem.InstallmentsPaid < (oldItem.TotalInstallments ?? int.MaxValue))
                            oldItem.IsActive = true;
                    }
                }
                if (newPlanningItemId.HasValue)
                {
                    var newItem = await m_context.FinancePlanningItems.FindAsync(newPlanningItemId.Value);
                    if (newItem is { Type: "installment" })
                    {
                        newItem.InstallmentsPaid++;
                        if (newItem.InstallmentsPaid >= (newItem.TotalInstallments ?? int.MaxValue))
                            newItem.IsActive = false;
                    }
                }
                tx.PlanningItemId = newPlanningItemId;
            }

            // Reverse old balance effect, then apply new
            await AdjustAccountBalancesAsync(oldType, oldAccountId, oldAmount, oldToAccountId, oldToAmount, -1);
            await AdjustAccountBalancesAsync(tx.Type, tx.AccountId, tx.Amount, tx.ToAccountId, tx.ToAmount, +1);

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Transaction {TransactionId} updated", id);
            return ApiResponse<TransactionResponse>.SuccessResponse(TransactionResponse.FromEntity(tx), "Transaction updated");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error updating transaction {TransactionId}", id);
            return ApiResponse<TransactionResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteTransactionAsync(Guid id, Guid userId)
    {
        try
        {
            var tx = await m_context.FinanceTransactions.FindAsync(id);
            if (tx is null)
                return ApiResponse<bool>.ErrorResponse("Transaction not found");

            if (!await HasAccessAsync(tx.HouseholdId, userId))
                return ApiResponse<bool>.ErrorResponse("Access denied");

            if (tx.PlanningItemId.HasValue)
            {
                var planningItem = await m_context.FinancePlanningItems.FindAsync(tx.PlanningItemId.Value);
                if (planningItem is { Type: "installment" })
                {
                    planningItem.InstallmentsPaid = Math.Max(0, planningItem.InstallmentsPaid - 1);
                    if (!planningItem.IsActive && planningItem.InstallmentsPaid < (planningItem.TotalInstallments ?? int.MaxValue))
                        planningItem.IsActive = true;
                }
            }

            await AdjustAccountBalancesAsync(tx.Type, tx.AccountId, tx.Amount, tx.ToAccountId, tx.ToAmount, -1);
            m_context.FinanceTransactions.Remove(tx);
            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Transaction {TransactionId} deleted", id);
            return ApiResponse<bool>.SuccessResponse(true, "Transaction deleted");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error deleting transaction {TransactionId}", id);
            return ApiResponse<bool>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ImportResult>> ImportTransactionsAsync(ImportTransactionsRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<ImportResult>.ErrorResponse("Access denied");

            var accountIds = request.Transactions
                .Where(t => t.AccountId.HasValue)
                .Select(t => t.AccountId!.Value)
                .Distinct()
                .ToList();

            var accounts = await m_context.FinanceAccounts
                .Where(a => accountIds.Contains(a.Id) && a.HouseholdId == request.HouseholdId)
                .ToDictionaryAsync(a => a.Id);

            int imported = 0, skipped = 0;
            var transactions = new List<FinanceTransaction>();

            foreach (var item in request.Transactions)
            {
                FinanceAccount? account = item.AccountId.HasValue && accounts.TryGetValue(item.AccountId.Value, out var acc)
                    ? acc : null;

                var refMonth = !string.IsNullOrEmpty(item.RefMonth)
                    ? item.RefMonth
                    : CalcRefMonth(item.Date, account);

                transactions.Add(new FinanceTransaction
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    CreatedBy = userId,
                    AccountId = item.AccountId,
                    Description = item.Description,
                    Amount = item.Amount,
                    Currency = item.Currency,
                    Date = item.Date,
                    RefMonth = refMonth,
                    Type = item.Type,
                    Category = item.Type == "income" ? null : item.Category,
                    CreatedAt = DateTime.UtcNow,
                });
                imported++;
            }

            m_context.FinanceTransactions.AddRange(transactions);

            // Update account balances for imported transactions
            foreach (var tx in transactions)
            {
                if (!tx.AccountId.HasValue) continue;
                if (!accounts.TryGetValue(tx.AccountId.Value, out var acc)) continue;
                acc.Balance = (acc.Balance ?? 0m) + (tx.Type == "income" ? tx.Amount : -tx.Amount);
            }

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Imported {Count} transactions for household {HouseholdId}", imported, request.HouseholdId);
            return ApiResponse<ImportResult>.SuccessResponse(new ImportResult(imported, skipped), $"Imported {imported} transactions");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error importing transactions for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<ImportResult>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<ImportResult>> ImportAccountsAsync(ImportAccountsRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<ImportResult>.ErrorResponse("Access denied");

            var validTypes = new[] { "account", "cc" };
            var validCurrencies = new[] { "BRL", "EUR", "USD", "PYG" };

            int imported = 0, skipped = 0;
            var accounts = new List<FinanceAccount>();

            foreach (var item in request.Accounts)
            {
                if (string.IsNullOrWhiteSpace(item.Name) ||
                    !validTypes.Contains(item.Type) ||
                    !validCurrencies.Contains(item.Currency))
                {
                    skipped++;
                    continue;
                }

                accounts.Add(new FinanceAccount
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    OwnerId = userId,
                    Name = item.Name,
                    Currency = item.Currency,
                    Type = item.Type,
                    CloseDay = item.Type == "cc" ? item.CloseDay : null,
                    CloseMonthIsNext = item.Type == "cc" && item.CloseMonthIsNext,
                    DueDay = item.Type == "cc" ? item.DueDay : null,
                    Limit = item.Type == "cc" ? item.Limit : null,
                    Balance = item.Balance,
                    CreatedAt = DateTime.UtcNow,
                });
                imported++;
            }

            m_context.FinanceAccounts.AddRange(accounts);
            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Imported {Count} accounts for household {HouseholdId}", imported, request.HouseholdId);
            return ApiResponse<ImportResult>.SuccessResponse(new ImportResult(imported, skipped), $"Imported {imported} accounts");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error importing accounts for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<ImportResult>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    // ── Budget ────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<BudgetResponse>> GetBudgetAsync(Guid householdId, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<BudgetResponse>.ErrorResponse("Access denied");

            var budget = await m_context.FinanceBudgets
                .FirstOrDefaultAsync(b => b.HouseholdId == householdId);

            var response = budget is null
                ? BudgetResponse.Default(householdId)
                : BudgetResponse.FromEntity(budget);

            return ApiResponse<BudgetResponse>.SuccessResponse(response);
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting budget for household {HouseholdId}", householdId);
            return ApiResponse<BudgetResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<BudgetResponse>> UpsertBudgetAsync(UpsertBudgetRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<BudgetResponse>.ErrorResponse("Access denied");

            var existing = await m_context.FinanceBudgets
                .FirstOrDefaultAsync(b => b.HouseholdId == request.HouseholdId);

            if (existing is null)
            {
                existing = new FinanceBudget
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    Income = request.Income ?? 0m,
                    IncomeCurrency = request.IncomeCurrency ?? "BRL",
                    Goals = request.Goals,
                    UpdatedAt = DateTime.UtcNow,
                };
                m_context.FinanceBudgets.Add(existing);
            }
            else
            {
                existing.Goals = request.Goals;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Budget upserted for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<BudgetResponse>.SuccessResponse(BudgetResponse.FromEntity(existing), "Budget updated");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error upserting budget for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<BudgetResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    // ── Rates ─────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<RatesResponse>> GetRatesAsync(Guid householdId, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<RatesResponse>.ErrorResponse("Access denied");

            var household = await m_context.Households.FindAsync(householdId);
            var defaultCurrency = household?.DefaultCurrency ?? "BRL";

            var ratesEntity = await m_context.FinanceRates
                .FirstOrDefaultAsync(r => r.HouseholdId == householdId);
            var dbRates = ratesEntity?.Rates ?? new Dictionary<string, decimal>
                { ["BRL"] = 1, ["EUR"] = 6.0m, ["USD"] = 5.5m, ["PYG"] = 0.0007m };

            var liveRates = await FetchTodayRatesAsync(defaultCurrency, dbRates);

            var response = new RatesResponse
            {
                Id = ratesEntity?.Id ?? Guid.Empty,
                HouseholdId = householdId,
                Rates = liveRates,
                UpdatedAt = DateTime.UtcNow,
            };

            return ApiResponse<RatesResponse>.SuccessResponse(response);
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting rates for household {HouseholdId}", householdId);
            return ApiResponse<RatesResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<RatesResponse>> UpsertRatesAsync(UpsertRatesRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<RatesResponse>.ErrorResponse("Access denied");

            var existing = await m_context.FinanceRates
                .FirstOrDefaultAsync(r => r.HouseholdId == request.HouseholdId);

            if (existing is null)
            {
                existing = new FinanceRates
                {
                    Id = Guid.NewGuid(),
                    HouseholdId = request.HouseholdId,
                    Rates = request.Rates,
                    UpdatedAt = DateTime.UtcNow,
                };
                m_context.FinanceRates.Add(existing);
            }
            else
            {
                existing.Rates = request.Rates;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await m_context.SaveChangesAsync();

            m_logger.LogInformation("Rates upserted for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<RatesResponse>.SuccessResponse(RatesResponse.FromEntity(existing), "Rates updated");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error upserting rates for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<RatesResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    public async Task<ApiResponse<DashboardResponse>> GetDashboardAsync(Guid householdId, Guid userId, string month)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<DashboardResponse>.ErrorResponse("Access denied");

            if (!System.Text.RegularExpressions.Regex.IsMatch(month, @"^\d{4}-\d{2}$"))
                return ApiResponse<DashboardResponse>.ErrorResponse("Month must be in YYYY-MM format");

            // Load household default currency
            var household = await m_context.Households.FindAsync(householdId);
            var defaultCurrency = household?.DefaultCurrency ?? "BRL";

            // Load DB rates as fallback, then overlay with Frankfurter live rates
            var ratesEntity = await m_context.FinanceRates
                .FirstOrDefaultAsync(r => r.HouseholdId == householdId);
            var dbRates = ratesEntity?.Rates ?? new Dictionary<string, decimal>
                { ["BRL"] = 1, ["EUR"] = 6.0m, ["USD"] = 5.5m, ["PYG"] = 0.0007m };
            var rates = await FetchTodayRatesAsync(defaultCurrency, dbRates);

            // Load budget
            var budget = await m_context.FinanceBudgets
                .FirstOrDefaultAsync(b => b.HouseholdId == householdId);

            // Load current month transactions
            var monthTxs = await m_context.FinanceTransactions
                .Include(tx => tx.Account)
                .Where(tx => tx.HouseholdId == householdId && tx.RefMonth == month)
                .ToListAsync();

            // Income & expenses in BRL (base)
            var totalIncome = monthTxs
                .Where(tx => tx.Type == "income")
                .Sum(tx => ToBase(tx.Amount, tx.Currency, rates));

            var totalExpenses = monthTxs
                .Where(tx => tx.Type == "expense")
                .Sum(tx => ToBase(tx.Amount, tx.Currency, rates));

            // By category — budget allocations use actual income from transactions
            var byCategory = ValidCategories.Select(cat =>
            {
                var total = monthTxs
                    .Where(tx => tx.Type == "expense" && tx.Category == cat)
                    .Sum(tx => ToBase(tx.Amount, tx.Currency, rates));

                var goalPct = budget?.Goals.TryGetValue(cat, out var g) == true ? g : 0m;
                var budgetAmt = totalIncome * goalPct / 100m;
                var usedPct = budgetAmt > 0 ? Math.Min(total / budgetAmt * 100m, 999m) : 0m;

                return new CategoryBreakdown
                {
                    Category = cat,
                    Total = Math.Round(total, 2),
                    Budget = Math.Round(budgetAmt, 2),
                    UsedPercent = Math.Round(usedPct, 1),
                };
            }).ToList();

            // CC invoices
            var ccAccounts = await m_context.FinanceAccounts
                .Where(a => a.HouseholdId == householdId && a.Type == "cc")
                .ToListAsync();

            var invoices = ccAccounts.Select(acc =>
            {
                var invoiceTotal = monthTxs
                    .Where(tx => tx.Type == "expense" && tx.AccountId == acc.Id)
                    .Sum(tx => ToBase(tx.Amount, tx.Currency, rates));

                var limitBase = acc.Limit.HasValue ? ToBase(acc.Limit.Value, acc.Currency, rates) : (decimal?)null;
                var usedPct = limitBase.HasValue && limitBase > 0
                    ? Math.Min(invoiceTotal / limitBase.Value * 100m, 100m)
                    : 0m;

                return new AccountInvoice
                {
                    AccountId = acc.Id,
                    AccountName = acc.Name,
                    Currency = acc.Currency,
                    InvoiceTotal = Math.Round(invoiceTotal, 2),
                    Limit = limitBase.HasValue ? Math.Round(limitBase.Value, 2) : null,
                    UsedPercent = Math.Round(usedPct, 1),
                    IsOverLimit = limitBase.HasValue && invoiceTotal > limitBase.Value,
                };
            }).ToList();

            // 6-month history
            var historyMonths = Enumerable.Range(0, 6)
                .Select(i =>
                {
                    var parts = month.Split('-');
                    var dt = new DateTime(int.Parse(parts[0]), int.Parse(parts[1]), 1)
                        .AddMonths(-i);
                    return $"{dt.Year:D4}-{dt.Month:D2}";
                })
                .Reverse()
                .ToList();

            var historyTxs = await m_context.FinanceTransactions
                .Where(tx => tx.HouseholdId == householdId && historyMonths.Contains(tx.RefMonth))
                .ToListAsync();

            var history = historyMonths.Select(m =>
            {
                var mTxs = historyTxs.Where(tx => tx.RefMonth == m).ToList();
                return new MonthlyHistoryPoint
                {
                    Month = m,
                    Income = Math.Round(mTxs.Where(tx => tx.Type == "income").Sum(tx => ToBase(tx.Amount, tx.Currency, rates)), 2),
                    Expenses = Math.Round(mTxs.Where(tx => tx.Type == "expense").Sum(tx => ToBase(tx.Amount, tx.Currency, rates)), 2),
                };
            }).ToList();

            var dashboard = new DashboardResponse
            {
                Month = month,
                BaseCurrency = defaultCurrency,
                TotalIncome = Math.Round(totalIncome, 2),
                TotalExpenses = Math.Round(totalExpenses, 2),
                Balance = Math.Round(totalIncome - totalExpenses, 2),
                ByCategory = byCategory,
                Invoices = invoices,
                History = history,
            };

            return ApiResponse<DashboardResponse>.SuccessResponse(dashboard);
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting dashboard for household {HouseholdId} month {Month}", householdId, month);
            return ApiResponse<DashboardResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    // ── CC payment recurrence helpers ─────────────────────────────────────────

    private async Task<Guid> CreateCcPaymentRecurrenceAsync(Guid householdId, Guid userId, int dueDay, string accountName)
    {
        var recurrence = new TaskRecurrence
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Pattern = "monthly",
            RecurrenceDay = dueDay,
            IsActive = true,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
        };
        m_context.TaskRecurrences.Add(recurrence);

        var firstDate = NextMonthlyOccurrence(dueDay);
        m_context.Tasks.Add(new TaskEntity
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            RecurrenceId = recurrence.Id,
            Title = $"Pagar fatura: {accountName}",
            Description = $"Vencimento dia {dueDay}",
            DueDate = firstDate.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
            Status = "active",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        return recurrence.Id;
    }

    private async Task UpdateFutureCcTaskTitlesAsync(Guid recurrenceId, string newTitle)
    {
        var todayDt = DateOnly.FromDateTime(DateTime.UtcNow).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var futureTasks = await m_context.Tasks
            .Where(t => t.RecurrenceId == recurrenceId && t.DueDate >= todayDt && t.Status == "active")
            .ToListAsync();

        foreach (var t in futureTasks)
        {
            t.Title = newTitle;
            t.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static DateOnly NextMonthlyOccurrence(int dayOfMonth)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int offset = 0; offset < 2; offset++)
        {
            var anchor = today.AddMonths(offset);
            int clamped = Math.Min(dayOfMonth, DateTime.DaysInMonth(anchor.Year, anchor.Month));
            var candidate = new DateOnly(anchor.Year, anchor.Month, clamped);
            if (candidate >= today) return candidate;
        }
        return today;
    }
}
