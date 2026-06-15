using HomeManager.API.Data;
using HomeManager.API.Models;
using HomeManager.API.Models.DTOs;
using HomeManager.API.Models.DTOs.Requests;
using HomeManager.API.Models.Finance;
using Microsoft.EntityFrameworkCore;

namespace HomeManager.API.Services.Finance;

public class PlanningService : IPlanningService
{
    private readonly ILogger<PlanningService> m_logger;
    private readonly ApplicationDbContext m_context;

    public PlanningService(ILogger<PlanningService> logger, ApplicationDbContext context)
    {
        m_logger = logger;
        m_context = context;
    }

    private async Task<bool> HasAccessAsync(Guid householdId, Guid userId) =>
        await m_context.HouseholdUsers
            .AnyAsync(hu => hu.HouseholdId == householdId && hu.UserId == userId);

    public async Task<ApiResponse<List<PlanningItemResponse>>> GetItemsAsync(Guid householdId, Guid userId, string? month = null)
    {
        try
        {
            if (!await HasAccessAsync(householdId, userId))
                return ApiResponse<List<PlanningItemResponse>>.ErrorResponse("Access denied");

            var items = await m_context.FinancePlanningItems
                .Where(p => p.HouseholdId == householdId && p.IsActive)
                .OrderBy(p => p.DayOfMonth == null ? 1 : 0)
                .ThenBy(p => p.DayOfMonth)
                .ThenBy(p => p.Description)
                .ToListAsync();

            Dictionary<Guid, (Guid txId, bool isCC)> paidMap = [];
            if (!string.IsNullOrEmpty(month) && items.Count > 0)
            {
                var ids = items.Select(i => i.Id).ToHashSet();
                var paidTxs = await m_context.FinanceTransactions
                    .Where(t => t.PlanningItemId.HasValue && ids.Contains(t.PlanningItemId.Value) && t.RefMonth == month)
                    .Include(t => t.Account)
                    .ToListAsync();
                foreach (var t in paidTxs)
                    paidMap[t.PlanningItemId!.Value] = (t.Id, t.Account?.Type == "cc");
            }

            return ApiResponse<List<PlanningItemResponse>>.SuccessResponse(
                items.Select(p =>
                {
                    var paid = paidMap.TryGetValue(p.Id, out var info);
                    return PlanningItemResponse.FromEntity(p, paid, paid ? info.txId : null, paid && info.isCC);
                }).ToList());
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error getting planning items for household {HouseholdId}", householdId);
            return ApiResponse<List<PlanningItemResponse>>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PlanningItemResponse>> CreateItemAsync(CreatePlanningItemRequest request, Guid userId)
    {
        try
        {
            if (!await HasAccessAsync(request.HouseholdId, userId))
                return ApiResponse<PlanningItemResponse>.ErrorResponse("Access denied");

            var item = new FinancePlanningItem
            {
                Id = Guid.NewGuid(),
                HouseholdId = request.HouseholdId,
                Description = request.Description,
                Amount = request.Amount,
                Currency = request.Currency,
                Category = request.Category,
                Type = request.Type,
                DayOfMonth = request.DayOfMonth,
                TotalInstallments = request.Type == "installment" ? request.TotalInstallments : null,
                InstallmentsPaid = request.Type == "installment" ? request.InstallmentsPaid : 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            m_context.FinancePlanningItems.Add(item);
            await m_context.SaveChangesAsync();

            return ApiResponse<PlanningItemResponse>.SuccessResponse(PlanningItemResponse.FromEntity(item), "Item created");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error creating planning item for household {HouseholdId}", request.HouseholdId);
            return ApiResponse<PlanningItemResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<PlanningItemResponse>> UpdateItemAsync(Guid id, UpdatePlanningItemRequest request, Guid userId)
    {
        try
        {
            var item = await m_context.FinancePlanningItems.FindAsync(id);
            if (item is null)
                return ApiResponse<PlanningItemResponse>.ErrorResponse("Item not found");

            if (!await HasAccessAsync(item.HouseholdId, userId))
                return ApiResponse<PlanningItemResponse>.ErrorResponse("Access denied");

            item.Description = request.Description;
            item.Amount = request.Amount;
            item.Currency = request.Currency;
            item.Category = string.IsNullOrEmpty(request.Category) ? null : request.Category;
            item.Type = request.Type;
            item.DayOfMonth = request.DayOfMonth;
            item.TotalInstallments = request.Type == "installment" ? request.TotalInstallments : null;
            item.InstallmentsPaid = request.Type == "installment" ? request.InstallmentsPaid : 0;
            item.IsActive = request.IsActive;

            await m_context.SaveChangesAsync();

            return ApiResponse<PlanningItemResponse>.SuccessResponse(PlanningItemResponse.FromEntity(item));
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error updating planning item {Id}", id);
            return ApiResponse<PlanningItemResponse>.ErrorResponse($"Error: {ex.Message}");
        }
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(Guid id, Guid userId)
    {
        try
        {
            var item = await m_context.FinancePlanningItems.FindAsync(id);
            if (item is null)
                return ApiResponse<bool>.ErrorResponse("Item not found");

            if (!await HasAccessAsync(item.HouseholdId, userId))
                return ApiResponse<bool>.ErrorResponse("Access denied");

            m_context.FinancePlanningItems.Remove(item);
            await m_context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Item deleted");
        }
        catch (Exception ex)
        {
            m_logger.LogError(ex, "Error deleting planning item {Id}", id);
            return ApiResponse<bool>.ErrorResponse($"Error: {ex.Message}");
        }
    }
}
