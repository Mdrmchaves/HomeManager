import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from './finance.service';
import { FinanceAccount } from '../models/finance-account.model';
import { FinanceRates } from '../models/finance-budget.model';

/**
 * Shared state for Finance module.
 * Caches accounts (active only) and rates per householdId.
 * Components inject this to avoid redundant HTTP calls.
 */
@Injectable({ providedIn: 'root' })
export class FinanceStateService {
  private financeService = inject(FinanceService);

  private cachedHouseholdId = '';
  private cachedMonth = '';

  // Public signals — read by any component
  accounts = signal<FinanceAccount[]>([]);
  rates = signal<FinanceRates | null>(null);
  accountsLoading = signal(false);

  /**
   * Call from the parent finance component on every householdId/month change.
   * Reloads accounts when household changes or when month changes (CC invoices).
   */
  async init(householdId: string, month: string): Promise<void> {
    if (!householdId) return;

    const householdChanged = householdId !== this.cachedHouseholdId;
    const monthChanged = month !== this.cachedMonth;

    this.cachedHouseholdId = householdId;
    this.cachedMonth = month;

    if (householdChanged) {
      await Promise.all([
        this.loadAccounts(householdId, month),
        this.loadRates(householdId),
      ]);
    } else if (monthChanged && this.accounts().some(a => a.type === 'cc')) {
      // Reload only accounts to refresh CC invoice for new month
      await this.loadAccounts(householdId, month);
    }
  }

  /** Force reload of accounts (call after create/update/delete account). */
  async refreshAccounts(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    await this.loadAccounts(this.cachedHouseholdId, this.cachedMonth);
  }

  /** Force reload of rates (call after upsertRates). */
  async refreshRates(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    await this.loadRates(this.cachedHouseholdId);
  }

  /** Invalidate all — use when switching household or logging out. */
  invalidate(): void {
    this.cachedHouseholdId = '';
    this.cachedMonth = '';
    this.accounts.set([]);
    this.rates.set(null);
  }

  private async loadAccounts(householdId: string, month: string): Promise<void> {
    this.accountsLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getAccounts(householdId, month)
      );
      this.accounts.set(data);
    } catch {
      // keep previous value on error
    } finally {
      this.accountsLoading.set(false);
    }
  }

  private async loadRates(householdId: string): Promise<void> {
    try {
      const data = await firstValueFrom(this.financeService.getRates(householdId));
      this.rates.set(data);
    } catch {
      // keep previous value
    }
  }
}
