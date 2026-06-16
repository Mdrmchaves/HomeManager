import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from './finance.service';
import { FinanceAccount } from '../models/finance-account.model';
import { FinanceTransaction } from '../models/finance-transaction.model';
import { FinancePlanningItem } from '../models/finance-planning.model';
import { FinanceRates } from '../models/finance-budget.model';

/**
 * Central store for the Finance module.
 * All tabs read from these signals — no independent HTTP calls per tab.
 * Cache key: householdId + month. init() is a no-op when neither changes.
 */
@Injectable({ providedIn: 'root' })
export class FinanceStateService {
  private financeService = inject(FinanceService);

  private cachedHouseholdId = '';
  private cachedMonth = '';
  private accountsDirty = false;

  // ── Public signals (read by tabs) ─────────────────────────────────────────
  // accounts: ALL accounts (active + inactive) with currentInvoice for CC
  accounts    = signal<FinanceAccount[]>([]);
  transactions = signal<FinanceTransaction[]>([]);
  planningItems = signal<FinancePlanningItem[]>([]);
  rates        = signal<FinanceRates | null>(null);

  accountsLoading    = signal(false);
  transactionsLoading = signal(false);
  planningLoading    = signal(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async init(householdId: string, month: string): Promise<void> {
    if (!householdId) return;
    const householdChanged = householdId !== this.cachedHouseholdId;
    const monthChanged     = month !== this.cachedMonth;
    this.cachedHouseholdId = householdId;
    this.cachedMonth       = month;

    if (householdChanged) {
      await Promise.all([
        this.loadAccounts(householdId, month),
        this.loadTransactions(householdId, month),
        this.loadPlanningItems(householdId, month),
        this.loadRates(householdId),
      ]);
    } else if (monthChanged) {
      await Promise.all([
        this.loadAccounts(householdId, month),
        this.loadTransactions(householdId, month),
        this.loadPlanningItems(householdId, month),
      ]);
    }
    // Same household + same month → cached data still valid, no HTTP
  }

  invalidate(): void {
    this.cachedHouseholdId = '';
    this.cachedMonth       = '';
    this.accountsDirty     = false;
    this.accounts.set([]);
    this.transactions.set([]);
    this.planningItems.set([]);
    this.rates.set(null);
  }

  // ── Dirty / refresh (lazy account balance sync after tx mutations) ─────────

  markAccountsDirty(): void {
    this.accountsDirty = true;
  }

  async refreshIfDirty(): Promise<void> {
    if (!this.accountsDirty || !this.cachedHouseholdId) return;
    this.accountsDirty = false;
    await this.loadAccounts(this.cachedHouseholdId, this.cachedMonth);
  }

  // ── Explicit reloads (called after mutations that change server state) ─────

  async reloadAccounts(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    this.accountsDirty = false;
    await this.loadAccounts(this.cachedHouseholdId, this.cachedMonth);
  }

  async reloadPlanningItems(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    await this.loadPlanningItems(this.cachedHouseholdId, this.cachedMonth);
  }

  async refreshRates(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    await this.loadRates(this.cachedHouseholdId);
  }

  // ── In-list mutation helpers (optimistic updates) ─────────────────────────

  addTransaction(tx: FinanceTransaction): void {
    this.transactions.update(list => [tx, ...list]);
  }

  patchTransaction(tx: FinanceTransaction): void {
    this.transactions.update(list => list.map(t => t.id === tx.id ? tx : t));
  }

  removeTransaction(id: string): void {
    this.transactions.update(list => list.filter(t => t.id !== id));
  }

  addPlanningItem(item: FinancePlanningItem): void {
    this.planningItems.update(list => [item, ...list]);
  }

  patchPlanningItem(item: FinancePlanningItem): void {
    // Preserve server-computed paid status — edit response always returns paidThisMonth: false
    this.planningItems.update(list => list.map(p => {
      if (p.id !== item.id) return p;
      return { ...item, paidThisMonth: p.paidThisMonth, paidTransactionId: p.paidTransactionId, paidViaCC: p.paidViaCC };
    }));
  }

  removePlanningItem(id: string): void {
    this.planningItems.update(list => list.filter(p => p.id !== id));
  }

  // ── Private loaders ───────────────────────────────────────────────────────

  private async loadAccounts(householdId: string, month: string): Promise<void> {
    this.accountsLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getAccounts(householdId, month || undefined, true)
      );
      this.accounts.set(data);
    } catch {
      // keep previous value on error
    } finally {
      this.accountsLoading.set(false);
    }
  }

  private async loadTransactions(householdId: string, month: string): Promise<void> {
    this.transactionsLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getTransactions(householdId, { month, pageSize: 100 })
      );
      this.transactions.set(data.items);
    } catch {
      // keep previous value on error
    } finally {
      this.transactionsLoading.set(false);
    }
  }

  private async loadPlanningItems(householdId: string, month: string): Promise<void> {
    this.planningLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getPlanningItems(householdId, month || undefined)
      );
      this.planningItems.set(data);
    } catch {
      // keep previous value on error
    } finally {
      this.planningLoading.set(false);
    }
  }

  private async loadRates(householdId: string): Promise<void> {
    try {
      const data = await firstValueFrom(this.financeService.getRates(householdId));
      this.rates.set(data);
    } catch {
      // keep previous value on error
    }
  }
}
