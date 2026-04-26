import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import {
  FinanceDashboard,
  CATEGORY_LABELS,
  CATEGORY_DOT_COLORS,
  FinanceCategory,
} from '../../../../core/models/finance-budget.model';

@Component({
  selector: 'app-dashboard-tab',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      @if (loading()) {
        <div class="grid grid-cols-3 gap-4">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-24"></div>
          }
        </div>
      } @else if (dashboard()) {
        <!-- Metrics -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-white rounded-xl border border-stone-200 p-4">
            <p class="text-xs text-stone-500 mb-1">Receita</p>
            <p class="text-xl font-bold text-emerald-600">{{ dashboard()!.totalIncome | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white rounded-xl border border-stone-200 p-4">
            <p class="text-xs text-stone-500 mb-1">Gastos</p>
            <p class="text-xl font-bold text-red-600">{{ dashboard()!.totalExpenses | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white rounded-xl border border-stone-200 p-4">
            <p class="text-xs text-stone-500 mb-1">Saldo</p>
            <p class="text-xl font-bold" [class.text-emerald-600]="dashboard()!.balance >= 0" [class.text-red-600]="dashboard()!.balance < 0">
              {{ dashboard()!.balance | number:'1.2-2' }}
            </p>
          </div>
        </div>

        <!-- CC Invoices -->
        @if (dashboard()!.invoices.length > 0) {
          <div class="bg-white rounded-xl border border-stone-200 p-5">
            <h3 class="text-sm font-semibold text-stone-700 mb-4">Faturas</h3>
            <div class="space-y-3">
              @for (inv of dashboard()!.invoices; track inv.accountId) {
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-stone-700">{{ inv.accountName }}</span>
                    <span class="text-sm font-medium" [class.text-red-600]="inv.isOverLimit">
                      {{ inv.invoiceTotal | number:'1.2-2' }}
                      @if (inv.limit) { <span class="text-stone-400 font-normal">/ {{ inv.limit | number:'1.2-2' }}</span> }
                    </span>
                  </div>
                  @if (inv.limit) {
                    <div class="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        [class.bg-emerald-500]="inv.usedPercent < 75"
                        [class.bg-amber-500]="inv.usedPercent >= 75 && !inv.isOverLimit"
                        [class.bg-red-500]="inv.isOverLimit"
                        [style.width.%]="inv.usedPercent"
                      ></div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- By Category -->
        <div class="bg-white rounded-xl border border-stone-200 p-5">
          <h3 class="text-sm font-semibold text-stone-700 mb-4">Por Categoria</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (cat of dashboard()!.byCategory; track cat.category) {
              <div>
                <div class="flex justify-between items-center mb-1">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" [class]="dotColor(cat.category)"></span>
                    <span class="text-sm text-stone-700">{{ label(cat.category) }}</span>
                  </div>
                  <span class="text-sm font-medium text-stone-800">{{ cat.total | number:'1.2-2' }}</span>
                </div>
                @if (cat.budget > 0) {
                  <div class="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      [class.bg-emerald-500]="cat.usedPercent < 75"
                      [class.bg-amber-500]="cat.usedPercent >= 75 && cat.usedPercent < 100"
                      [class.bg-red-500]="cat.usedPercent >= 100"
                      [style.width.%]="Math.min(cat.usedPercent, 100)"
                    ></div>
                  </div>
                  <p class="text-xs text-stone-400 mt-0.5">
                    {{ cat.usedPercent | number:'1.0-0' }}% de {{ cat.budget | number:'1.2-2' }}
                  </p>
                }
              </div>
            }
          </div>
        </div>

        <!-- History -->
        @if (dashboard()!.history.length > 0) {
          <div class="bg-white rounded-xl border border-stone-200 p-5">
            <h3 class="text-sm font-semibold text-stone-700 mb-4">Histórico (6 meses)</h3>
            <div class="space-y-2">
              @for (h of dashboard()!.history; track h.month) {
                <div class="flex items-center gap-3">
                  <span class="text-xs text-stone-500 w-16 shrink-0">{{ h.month }}</span>
                  <div class="flex-1 flex gap-1">
                    <div class="h-4 bg-emerald-200 rounded" [style.width.%]="barWidth(h.income)"></div>
                    <div class="h-4 bg-red-200 rounded" [style.width.%]="barWidth(h.expenses)"></div>
                  </div>
                  <span class="text-xs text-stone-500 w-20 text-right">{{ h.income - h.expenses | number:'1.2-2' }}</span>
                </div>
              }
            </div>
          </div>
        }
      } @else if (error()) {
        <p class="text-red-600 text-sm">{{ error() }}</p>
      }
    </div>
  `,
})
export class DashboardTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);

  loading = signal(false);
  dashboard = signal<FinanceDashboard | null>(null);
  error = signal('');

  readonly Math = Math;
  readonly label = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;
  readonly dotColor = (cat: string) => CATEGORY_DOT_COLORS[cat as FinanceCategory] ?? 'bg-stone-400';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId'] || changes['month']) {
      this.load();
    }
  }

  barWidth(value: number): number {
    const max = Math.max(...(this.dashboard()?.history.flatMap(h => [h.income, h.expenses]) ?? [1]));
    return max > 0 ? (value / max) * 100 : 0;
  }

  private async load(): Promise<void> {
    if (!this.householdId || !this.month) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await firstValueFrom(this.financeService.getDashboard(this.householdId, this.month));
      this.dashboard.set(data);
    } catch {
      this.error.set('Erro ao carregar o painel.');
    } finally {
      this.loading.set(false);
    }
  }
}
