namespace HomeManager.API.Models.DTOs;

public class DashboardResponse
{
    public string Month { get; set; } = string.Empty;      // YYYY-MM
    public string BaseCurrency { get; set; } = "BRL";
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal Balance { get; set; }                    // TotalIncome - TotalExpenses
    public List<CategoryBreakdown> ByCategory { get; set; } = [];
    public List<AccountInvoice> Invoices { get; set; } = [];
    public List<MonthlyHistoryPoint> History { get; set; } = [];
}

public class CategoryBreakdown
{
    public string Category { get; set; } = string.Empty;   // lf | cf | co | mt | pr | es
    public decimal Total { get; set; }                     // in BaseCurrency
    public decimal Budget { get; set; }                    // allocated (income * goals% / 100)
    public decimal UsedPercent { get; set; }               // Total / Budget * 100 (0-100+)
}

public class AccountInvoice
{
    public Guid AccountId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal InvoiceTotal { get; set; }              // in BaseCurrency
    public decimal? Limit { get; set; }                    // in BaseCurrency, null if no limit
    public decimal UsedPercent { get; set; }               // 0-100, capped
    public bool IsOverLimit { get; set; }
}

public class MonthlyHistoryPoint
{
    public string Month { get; set; } = string.Empty;      // YYYY-MM
    public decimal Income { get; set; }
    public decimal Expenses { get; set; }
}
