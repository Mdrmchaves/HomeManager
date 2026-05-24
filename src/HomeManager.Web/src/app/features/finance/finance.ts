import { Component, signal, computed, inject, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HouseholdService } from '../../core/services/household.service';
import { FinanceStateService } from '../../core/services/finance-state.service';
import { PillTabsComponent } from '../../shared/components/pill-tabs/pill-tabs';
import { DashboardTabComponent } from './components/dashboard-tab/dashboard-tab';
import { TransactionsTabComponent } from './components/transactions-tab/transactions-tab';
import { RecurringTabComponent } from './components/recurring-tab/recurring-tab';
import { AccountsTabComponent } from './components/accounts-tab/accounts-tab';
import { BudgetTabComponent } from './components/budget-tab/budget-tab';
import { ImportModalComponent } from './components/import-modal/import-modal';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    PillTabsComponent,
    DashboardTabComponent,
    TransactionsTabComponent,
    RecurringTabComponent,
    AccountsTabComponent,
    BudgetTabComponent,
    ImportModalComponent,
  ],
  templateUrl: './finance.html',
})
export class FinanceComponent {
  private householdService = inject(HouseholdService);
  private financeState = inject(FinanceStateService);

  selectedHousehold = toSignal(this.householdService.selectedHousehold$);
  householdId = computed(() => this.selectedHousehold()?.id ?? '');

  activeTab = signal(0);
  readonly tabs = ['Painel', 'Transações', 'Recorrentes', 'Contas', 'Orçamento'];

  showImport = signal(false);

  // Active month state — shared across all tabs
  activeMonth = signal(this.currentMonth());

  constructor() {
    // Kick off shared state init whenever household or month changes
    effect(() => {
      const id = this.householdId();
      const month = this.activeMonth();
      if (id) this.financeState.init(id, month);
    });
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  get activeMonthLabel(): string {
    const [year, month] = this.activeMonth().split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    const [year, month] = this.activeMonth().split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    this.activeMonth.set(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  }

  nextMonth(): void {
    const [year, month] = this.activeMonth().split('-').map(Number);
    const next = new Date(year, month, 1);
    this.activeMonth.set(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }
}
