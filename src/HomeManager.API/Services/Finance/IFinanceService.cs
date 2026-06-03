using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;

namespace HomeManager.API.Services.Finance;

public interface IFinanceService
{
    // Accounts
    Task<ApiResponse<List<AccountResponse>>> GetAccountsAsync(Guid householdId, Guid userId, string? month = null, bool includeInactive = false);
    Task<ApiResponse<AccountResponse>> CreateAccountAsync(CreateAccountRequest request, Guid userId);
    Task<ApiResponse<AccountResponse>> UpdateAccountAsync(Guid id, UpdateAccountRequest request, Guid userId);
    Task<ApiResponse<bool>> DeleteAccountAsync(Guid id, Guid userId);
    Task<ApiResponse<AccountResponse>> RecalculateAccountBalanceAsync(Guid accountId, Guid userId);

    // Transactions
    Task<ApiResponse<PagedResponse<TransactionResponse>>> GetTransactionsAsync(
        Guid householdId, Guid userId,
        string? month, Guid? accountId, string? type, string? category,
        int page, int pageSize);
    Task<ApiResponse<TransactionResponse>> GetTransactionAsync(Guid id, Guid userId);
    Task<ApiResponse<TransactionResponse>> CreateTransactionAsync(CreateTransactionRequest request, Guid userId);
    Task<ApiResponse<TransactionResponse>> UpdateTransactionAsync(Guid id, UpdateTransactionRequest request, Guid userId);
    Task<ApiResponse<bool>> DeleteTransactionAsync(Guid id, Guid userId);
    Task<ApiResponse<ImportResult>> ImportTransactionsAsync(ImportTransactionsRequest request, Guid userId);
    Task<ApiResponse<ImportResult>> ImportAccountsAsync(ImportAccountsRequest request, Guid userId);

    // Budget
    Task<ApiResponse<BudgetResponse>> GetBudgetAsync(Guid householdId, Guid userId);
    Task<ApiResponse<BudgetResponse>> UpsertBudgetAsync(UpsertBudgetRequest request, Guid userId);

    // Rates
    Task<ApiResponse<RatesResponse>> GetRatesAsync(Guid householdId, Guid userId);
    Task<ApiResponse<RatesResponse>> UpsertRatesAsync(UpsertRatesRequest request, Guid userId);

    // Dashboard
    Task<ApiResponse<DashboardResponse>> GetDashboardAsync(Guid householdId, Guid userId, string month);
}

public record ImportResult(int Imported, int Skipped);
