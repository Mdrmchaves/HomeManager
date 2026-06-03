import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { FinanceAccount, CreateAccountRequest, UpdateAccountRequest, ImportAccountItem } from '../models/finance-account.model';
import {
  FinanceTransaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  PagedResponse,
  ImportResult,
} from '../models/finance-transaction.model';
import {
  FinancePlanningItem,
  CreatePlanningItemRequest,
  UpdatePlanningItemRequest,
} from '../models/finance-planning.model';
import {
  FinanceBudget,
  UpsertBudgetRequest,
  FinanceRates,
  UpsertRatesRequest,
  FinanceDashboard,
} from '../models/finance-budget.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private apiUrl = `${environment.apiUrl}/finance`;

  constructor(private http: HttpClient) {}

  // ── Accounts ──────────────────────────────────────────────────────────────

  getAccounts(householdId: string, month?: string, includeInactive?: boolean): Observable<FinanceAccount[]> {
    let params = new HttpParams().set('householdId', householdId);
    if (month) params = params.set('month', month);
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http
      .get<ApiResponse<FinanceAccount[]>>(`${this.apiUrl}/accounts`, { params })
      .pipe(map(r => r.data));
  }

  createAccount(request: CreateAccountRequest): Observable<FinanceAccount> {
    return this.http
      .post<ApiResponse<FinanceAccount>>(`${this.apiUrl}/accounts`, request)
      .pipe(map(r => r.data));
  }

  updateAccount(id: string, request: UpdateAccountRequest): Observable<FinanceAccount> {
    return this.http
      .put<ApiResponse<FinanceAccount>>(`${this.apiUrl}/accounts/${id}`, request)
      .pipe(map(r => r.data));
  }

  deleteAccount(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.apiUrl}/accounts/${id}`)
      .pipe(map(r => r.data));
  }

  recalculateAccount(id: string): Observable<FinanceAccount> {
    return this.http
      .post<ApiResponse<FinanceAccount>>(`${this.apiUrl}/accounts/${id}/recalculate`, {})
      .pipe(map(r => r.data));
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  getTransactions(
    householdId: string,
    options: {
      month?: string;
      accountId?: string;
      type?: string;
      category?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Observable<PagedResponse<FinanceTransaction>> {
    let params = new HttpParams().set('householdId', householdId);
    if (options.month) params = params.set('month', options.month);
    if (options.accountId) params = params.set('accountId', options.accountId);
    if (options.type) params = params.set('type', options.type);
    if (options.category) params = params.set('category', options.category);
    if (options.page) params = params.set('page', options.page.toString());
    if (options.pageSize) params = params.set('pageSize', options.pageSize.toString());

    return this.http
      .get<ApiResponse<PagedResponse<FinanceTransaction>>>(`${this.apiUrl}/transactions`, { params })
      .pipe(map(r => r.data));
  }

  createTransaction(request: CreateTransactionRequest): Observable<FinanceTransaction> {
    return this.http
      .post<ApiResponse<FinanceTransaction>>(`${this.apiUrl}/transactions`, request)
      .pipe(map(r => r.data));
  }

  updateTransaction(id: string, request: UpdateTransactionRequest): Observable<FinanceTransaction> {
    return this.http
      .put<ApiResponse<FinanceTransaction>>(`${this.apiUrl}/transactions/${id}`, request)
      .pipe(map(r => r.data));
  }

  deleteTransaction(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.apiUrl}/transactions/${id}`)
      .pipe(map(r => r.data));
  }

  importTransactions(
    householdId: string,
    transactions: CreateTransactionRequest[]
  ): Observable<ImportResult> {
    return this.http
      .post<ApiResponse<ImportResult>>(`${this.apiUrl}/transactions/import`, {
        householdId,
        transactions,
      })
      .pipe(map(r => r.data));
  }

  importAccounts(
    householdId: string,
    accounts: ImportAccountItem[]
  ): Observable<ImportResult> {
    return this.http
      .post<ApiResponse<ImportResult>>(`${this.apiUrl}/accounts/import`, {
        householdId,
        accounts,
      })
      .pipe(map(r => r.data));
  }

  // ── Planning ──────────────────────────────────────────────────────────────

  getPlanningItems(householdId: string): Observable<FinancePlanningItem[]> {
    const params = new HttpParams().set('householdId', householdId);
    return this.http
      .get<ApiResponse<FinancePlanningItem[]>>(`${environment.apiUrl}/planning`, { params })
      .pipe(map(r => r.data));
  }

  createPlanningItem(request: CreatePlanningItemRequest): Observable<FinancePlanningItem> {
    return this.http
      .post<ApiResponse<FinancePlanningItem>>(`${environment.apiUrl}/planning`, request)
      .pipe(map(r => r.data));
  }

  updatePlanningItem(id: string, request: UpdatePlanningItemRequest): Observable<FinancePlanningItem> {
    return this.http
      .put<ApiResponse<FinancePlanningItem>>(`${environment.apiUrl}/planning/${id}`, request)
      .pipe(map(r => r.data));
  }

  deletePlanningItem(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResponse<boolean>>(`${environment.apiUrl}/planning/${id}`)
      .pipe(map(r => r.data));
  }

  // ── Budget ────────────────────────────────────────────────────────────────

  getBudget(householdId: string): Observable<FinanceBudget> {
    const params = new HttpParams().set('householdId', householdId);
    return this.http
      .get<ApiResponse<FinanceBudget>>(`${this.apiUrl}/budget`, { params })
      .pipe(map(r => r.data));
  }

  upsertBudget(request: UpsertBudgetRequest): Observable<FinanceBudget> {
    return this.http
      .put<ApiResponse<FinanceBudget>>(`${this.apiUrl}/budget`, request)
      .pipe(map(r => r.data));
  }

  // ── Rates ─────────────────────────────────────────────────────────────────

  getRates(householdId: string): Observable<FinanceRates> {
    const params = new HttpParams().set('householdId', householdId);
    return this.http
      .get<ApiResponse<FinanceRates>>(`${this.apiUrl}/rates`, { params })
      .pipe(map(r => r.data));
  }

  upsertRates(request: UpsertRatesRequest): Observable<FinanceRates> {
    return this.http
      .put<ApiResponse<FinanceRates>>(`${this.apiUrl}/rates`, request)
      .pipe(map(r => r.data));
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  getDashboard(householdId: string, month: string): Observable<FinanceDashboard> {
    const params = new HttpParams().set('householdId', householdId).set('month', month);
    return this.http
      .get<ApiResponse<FinanceDashboard>>(`${this.apiUrl}/dashboard`, { params })
      .pipe(map(r => r.data));
  }
}
