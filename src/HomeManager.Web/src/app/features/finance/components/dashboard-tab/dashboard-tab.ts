import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceStateService } from '../../../../core/services/finance-state.service';
import {
  CATEGORY_LABELS,
  CATEGORY_DOT_COLORS,
  FinanceCategory,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  SupportedCurrency,
  MonthlyHistoryPoint,
} from '../../../../core/models/finance-budget.model';

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

@Component({
  selector: 'app-dashboard-tab',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">

      <!-- Header: currency selector -->
      <div class="flex items-center justify-between">
        <p class="text-xs text-stone-400">
          @if (!financeState.rates()) { Taxas não disponíveis — valores sem conversão }
        </p>
        <div class="flex rounded-lg border border-stone-200 overflow-hidden">
          @for (cur of currencies; track cur) {
            <button (click)="displayCurrency.set(cur)"
              class="px-2.5 py-1 text-xs font-medium transition-colors border-r border-stone-200 last:border-r-0"
              [class.bg-stone-800]="displayCurrency() === cur"
              [class.text-white]="displayCurrency() === cur"
              [class.text-stone-500]="displayCurrency() !== cur">
              {{ cur }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <!-- Skeleton -->
        <div class="grid grid-cols-3 gap-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-20"></div>
          }
        </div>
        <div class="bg-white rounded-xl border border-stone-200 p-5 animate-pulse h-28"></div>
      } @else {

        <!-- Metrics -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1.5">Receita</p>
            <p class="text-lg font-bold text-emerald-800 leading-tight">
              {{ currencySymbol() }} {{ metrics().income | number:'1.2-2' }}
            </p>
          </div>
          <div class="bg-red-50 border border-red-100 rounded-xl p-4">
            <p class="text-xs font-medium text-red-600 uppercase tracking-wide mb-1.5">Despesas</p>
            <p class="text-lg font-bold text-red-700 leading-tight">
              {{ currencySymbol() }} {{ metrics().expenses | number:'1.2-2' }}
            </p>
          </div>
          <div class="rounded-xl border p-4"
            [class.bg-emerald-50]="metrics().flow >= 0"
            [class.border-emerald-100]="metrics().flow >= 0"
            [class.bg-red-50]="metrics().flow < 0"
            [class.border-red-100]="metrics().flow < 0">
            <p class="text-xs font-medium uppercase tracking-wide mb-1.5"
              [class.text-emerald-700]="metrics().flow >= 0"
              [class.text-red-600]="metrics().flow < 0">
              Fluxo
            </p>
            <p class="text-lg font-bold leading-tight"
              [class.text-emerald-800]="metrics().flow >= 0"
              [class.text-red-700]="metrics().flow < 0">
              {{ metrics().flow >= 0 ? '+' : '' }}{{ currencySymbol() }} {{ metrics().flow | number:'1.2-2' }}
            </p>
          </div>
        </div>

        <!-- CC Invoices -->
        @if (ccInvoices().length > 0) {
          <div class="bg-white rounded-xl border border-stone-200 p-5">
            <h3 class="text-sm font-semibold text-stone-700 mb-3">Faturas CC</h3>
            <div class="space-y-4">
              @for (inv of ccInvoices(); track inv.id) {
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                      </svg>
                      <span class="text-sm text-stone-700">{{ inv.name }}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-sm font-semibold"
                        [class.text-red-600]="inv.isOverLimit"
                        [class.text-stone-800]="!inv.isOverLimit">
                        {{ currencySymbol() }} {{ inv.invoiceConverted | number:'1.2-2' }}
                      </span>
                      @if (inv.limitConverted !== null) {
                        <span class="text-xs text-stone-400"> / {{ currencySymbol() }} {{ inv.limitConverted | number:'1.2-2' }}</span>
                      }
                    </div>
                  </div>
                  @if (inv.limitConverted !== null) {
                    <div class="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all"
                        [class.bg-emerald-500]="inv.usedPct < 70"
                        [class.bg-amber-400]="inv.usedPct >= 70 && !inv.isOverLimit"
                        [class.bg-red-500]="inv.isOverLimit"
                        [style.width.%]="inv.usedPct">
                      </div>
                    </div>
                    <p class="text-xs text-stone-400 mt-0.5">{{ inv.usedPct }}% utilizado</p>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Gastos por Categoria -->
        @if (byCategory().length > 0) {
          <div class="bg-white rounded-xl border border-stone-200 p-5">
            <h3 class="text-sm font-semibold text-stone-700 mb-3">Gastos por Categoria</h3>
            <div class="space-y-2.5">
              @for (item of byCategory(); track item[0]) {
                <div class="flex items-center gap-3">
                  <span class="w-2 h-2 rounded-full shrink-0" [class]="dotColor(item[0])"></span>
                  <span class="text-sm text-stone-600 flex-1 truncate">{{ label(item[0]) }}</span>
                  <span class="text-sm font-semibold text-stone-800 shrink-0">
                    {{ currencySymbol() }} {{ item[1] | number:'1.2-2' }}
                  </span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Saldo das Contas -->
        @if (accountBalances().length > 0) {
          <div class="bg-white rounded-xl border border-stone-200 p-5">
            <h3 class="text-sm font-semibold text-stone-700 mb-3">Saldo das Contas</h3>
            <div class="space-y-2.5">
              @for (acc of accountBalances(); track acc.id) {
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm text-stone-600 truncate">{{ acc.name }}</span>
                  <span class="text-sm font-semibold shrink-0"
                    [class.text-emerald-700]="acc.balance >= 0"
                    [class.text-red-600]="acc.balance < 0">
                    {{ currencySymbol() }} {{ acc.balanceConverted | number:'1.2-2' }}
                  </span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Empty state -->
        @if (metrics().income === 0 && metrics().expenses === 0 && ccInvoices().length === 0) {
          <div class="text-center py-8">
            <p class="text-stone-400 text-sm">Nenhuma transação neste mês.</p>
          </div>
        }
      }

      <!-- Histórico 6 meses (lazy) -->
      <div class="bg-white rounded-xl border border-stone-200 p-5">
        <h3 class="text-sm font-semibold text-stone-700 mb-4">Histórico (6 meses)</h3>
        @if (historyLoading()) {
          <div class="space-y-3">
            @for (_ of [1,2,3,4,5,6]; track $index) {
              <div class="h-8 bg-stone-100 rounded animate-pulse"></div>
            }
          </div>
        } @else if (historyWithWidths().length > 0) {
          <div class="space-y-4">
            @for (h of historyWithWidths(); track h.label) {
              <div class="flex items-center gap-3">
                <span class="text-xs text-stone-500 w-12 shrink-0 text-right">{{ h.label }}</span>
                <div class="flex-1 space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <div class="h-2 bg-emerald-400 rounded-full min-w-[2px] transition-all" [style.width.%]="h.incomeWidth"></div>
                    <span class="text-xs text-stone-400 shrink-0">{{ h.income | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-2 bg-red-300 rounded-full min-w-[2px] transition-all" [style.width.%]="h.expenseWidth"></div>
                    <span class="text-xs text-stone-400 shrink-0">{{ h.expenses | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
          <div class="flex gap-4 mt-4 pt-3 border-t border-stone-100">
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-2 bg-emerald-400 rounded-full"></div>
              <span class="text-xs text-stone-400">Receita</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-3 h-2 bg-red-300 rounded-full"></div>
              <span class="text-xs text-stone-400">Despesas</span>
            </div>
            <span class="text-xs text-stone-300 ml-auto">moeda base do household</span>
          </div>
        } @else {
          <p class="text-stone-400 text-sm text-center py-4">Histórico não disponível.</p>
        }
      </div>

    </div>
  `,
})
export class DashboardTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  financeState = inject(FinanceStateService);

  displayCurrency = signal<SupportedCurrency>('BRL');
  history         = signal<MonthlyHistoryPoint[]>([]);
  historyLoading  = signal(false);

  readonly currencies     = [...SUPPORTED_CURRENCIES] as SupportedCurrency[];
  readonly currencySymbol = computed(() => CURRENCY_SYMBOLS[this.displayCurrency()]);
  readonly label    = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;
  readonly dotColor = (cat: string) => CATEGORY_DOT_COLORS[cat as FinanceCategory] ?? 'bg-stone-400';
  readonly loading  = computed(() =>
    this.financeState.transactionsLoading() || this.financeState.accountsLoading()
  );

  metrics = computed(() => {
    const rates  = this.financeState.rates()?.rates;
    const target = this.displayCurrency();
    const conv = (amount: number, cur: string) => {
      if (!rates) return cur === target ? amount : 0;
      return amount * (rates[cur] ?? 1) / (rates[target] ?? 1);
    };
    let income = 0, expenses = 0;
    for (const tx of this.financeState.transactions()) {
      if (tx.type === 'income')  income   += conv(tx.amount, tx.currency);
      if (tx.type === 'expense') expenses += conv(tx.amount, tx.currency);
    }
    return { income, expenses, flow: income - expenses };
  });

  ccInvoices = computed(() => {
    const rates  = this.financeState.rates()?.rates;
    const target = this.displayCurrency();
    const conv = (amount: number, cur: string) => {
      if (!rates) return cur === target ? amount : 0;
      return amount * (rates[cur] ?? 1) / (rates[target] ?? 1);
    };
    return this.financeState.accounts()
      .filter(a => a.type === 'cc' && a.isActive)
      .map(a => {
        const inv = a.currentInvoice ?? 0;
        const lim = a.limit ?? null;
        return {
          id:               a.id,
          name:             a.name,
          invoiceConverted: conv(inv, a.currency),
          limitConverted:   lim !== null ? conv(lim, a.currency) : null,
          usedPct:          lim && lim > 0 ? Math.min(100, Math.round((inv / lim) * 100)) : 0,
          isOverLimit:      !!lim && inv > lim,
        };
      });
  });

  byCategory = computed((): [FinanceCategory, number][] => {
    const rates  = this.financeState.rates()?.rates;
    const target = this.displayCurrency();
    const conv = (amount: number, cur: string) => {
      if (!rates) return cur === target ? amount : 0;
      return amount * (rates[cur] ?? 1) / (rates[target] ?? 1);
    };
    const totals: Record<string, number> = {};
    for (const tx of this.financeState.transactions()) {
      if (tx.type === 'expense' && tx.category) {
        totals[tx.category] = (totals[tx.category] ?? 0) + conv(tx.amount, tx.currency);
      }
    }
    return (Object.entries(totals) as [FinanceCategory, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  });

  accountBalances = computed(() => {
    const rates  = this.financeState.rates()?.rates;
    const target = this.displayCurrency();
    const conv = (amount: number, cur: string) => {
      if (!rates) return cur === target ? amount : 0;
      return amount * (rates[cur] ?? 1) / (rates[target] ?? 1);
    };
    return this.financeState.accounts()
      .filter(a => a.isActive && a.type === 'account')
      .map(a => ({
        id:                a.id,
        name:              a.name,
        balance:           a.balance,
        balanceConverted:  conv(a.balance, a.currency),
      }));
  });

  historyWithWidths = computed(() => {
    const pts = this.history();
    if (!pts.length) return [];
    const max = Math.max(...pts.flatMap(h => [h.income, h.expenses]), 1);
    return pts.map(h => ({
      label:        this.formatMonth(h.month),
      income:       h.income,
      expenses:     h.expenses,
      incomeWidth:  Math.round((h.income   / max) * 100),
      expenseWidth: Math.round((h.expenses / max) * 100),
    }));
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId'] || changes['month']) {
      this.loadHistory();
    }
  }

  formatMonth(m: string): string {
    const [y, mo] = m.split('-').map(Number);
    return `${MONTH_NAMES[mo - 1]}/${String(y).slice(2)}`;
  }

  private async loadHistory(): Promise<void> {
    if (!this.householdId || !this.month) return;
    this.historyLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getDashboard(this.householdId, this.month)
      );
      this.history.set(data.history);
    } catch {
      // history is optional — fail silently
    } finally {
      this.historyLoading.set(false);
    }
  }
}
