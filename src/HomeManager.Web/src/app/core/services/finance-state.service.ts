import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from './finance.service';
import { FinanceAccount } from '../models/finance-account.model';
import { FinanceRates } from '../models/finance-budget.model';

/**
 * Shared state for Finance module.
 * Caches accounts (active only, no CC invoice) and rates per householdId.
 * Accounts reload ONLY when the household changes or after an explicit refreshAccounts() call.
 * Month changes do NOT trigger a reload — accounts-tab fetches its own list with month+includeInactive.
 */
@Injectable({ providedIn: 'root' })
export class FinanceStateService {
  private financeService = inject(FinanceService);

  private cachedHouseholdId = '';

  // Public signals — read by any component
  accounts = signal<FinanceAccount[]>([]);
  rates = signal<FinanceRates | null>(null);
  accountsLoading = signal(false);

  /**
   * Call from the parent finance component on every householdId/month change.
   * Only triggers a load when the household changes — month changes are ignored.
   */
  async init(householdId: string, _month: string): Promise<void> {
    if (!householdId) return;

    const householdChanged = householdId !== this.cachedHouseholdId;
    this.cachedHouseholdId = householdId;

    if (householdChanged) {
      await Promise.all([
        this.loadAccounts(householdId),
        this.loadRates(householdId),
      ]);
    }
  }

  /** Force reload of accounts (call after create/update/delete account). */
  async refreshAccounts(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    await this.loadAccounts(this.cachedHouseholdId);
  }

  /** Force reload of rates (call after upsertRates). */
  async refreshRates(): Promise<void> {
    if (!this.cachedHouseholdId) return;
    await this.loadRates(this.cachedHouseholdId);
  }

  /** Invalidate all — use when switching household or logging out. */
  invalidate(): void {
    this.cachedHouseholdId = '';
    this.accounts.set([]);
    this.rates.set(null);
  }

  private async loadAccounts(householdId: string): Promise<void> {
    this.accountsLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getAccounts(householdId)
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
