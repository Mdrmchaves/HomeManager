import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import {
  FinanceBudget,
  FINANCE_CATEGORIES,
  CATEGORY_LABELS,
  FinanceCategory,
  SUPPORTED_CURRENCIES,
} from '../../../../core/models/finance-budget.model';

@Component({
  selector: 'app-budget-tab',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      @if (loading()) {
        <div class="bg-white rounded-xl border border-stone-200 p-5 animate-pulse h-48"></div>
      } @else {
        <div class="bg-white rounded-xl border border-stone-200 p-5 space-y-5">
          <h3 class="text-sm font-semibold text-stone-700">Orçamento Mensal</h3>

          <!-- Income -->
          <div class="flex gap-3">
            <input
              type="number" step="0.01" min="0"
              [value]="income()"
              (input)="income.set(+$any($event.target).value)"
              placeholder="Renda mensal"
              class="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
            <select
              [value]="incomeCurrency()"
              (change)="incomeCurrency.set($any($event.target).value)"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
              @for (cur of currencies; track cur) {
                <option [value]="cur">{{ cur }}</option>
              }
            </select>
          </div>

          <!-- Category goals -->
          <div class="space-y-4">
            @for (cat of categories; track cat) {
              <div>
                <div class="flex justify-between items-center mb-1.5">
                  <span class="text-sm text-stone-700">{{ label(cat) }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-stone-500">{{ goalAmount(cat) | number:'1.2-2' }}</span>
                    <input
                      type="number" min="0" max="100" step="1"
                      [value]="getGoal(cat)"
                      (input)="setGoal(cat, +$any($event.target).value)"
                      class="w-14 px-2 py-1 border border-stone-200 rounded text-xs text-right focus:outline-none focus:border-emerald-500" />
                    <span class="text-xs text-stone-400">%</span>
                  </div>
                </div>
                <div class="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-400 rounded-full transition-all" [style.width.%]="getGoal(cat)"></div>
                </div>
              </div>
            }
          </div>

          <!-- Total allocated -->
          <div class="flex justify-between items-center pt-2 border-t border-stone-100">
            <span class="text-sm text-stone-600">Total alocado</span>
            <span class="text-sm font-semibold"
              [class.text-emerald-600]="totalAllocated() <= 100"
              [class.text-red-600]="totalAllocated() > 100">
              {{ totalAllocated() | number:'1.0-0' }}%
            </span>
          </div>

          <button (click)="save()" [disabled]="saving()"
            class="w-full py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
            {{ saving() ? 'A guardar…' : 'Guardar Orçamento' }}
          </button>
          @if (saveMsg()) {
            <p class="text-sm text-center text-stone-600">{{ saveMsg() }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class BudgetTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;

  private financeService = inject(FinanceService);

  loading = signal(false);
  saving = signal(false);
  saveMsg = signal('');

  income = signal(0);
  incomeCurrency = signal('BRL');
  goals = signal<Record<string, number>>({ lf: 0, cf: 0, co: 0, mt: 0, pr: 0, es: 0 });

  readonly categories = FINANCE_CATEGORIES;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly label = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;

  totalAllocated = computed(() => Object.values(this.goals()).reduce((s, v) => s + v, 0));
  getGoal = (cat: string) => this.goals()[cat] || 0;
  goalAmount = (cat: string) => this.income() * this.getGoal(cat) / 100;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId']) this.load();
  }

  setGoal(cat: string, value: number): void {
    this.goals.update(g => ({ ...g, [cat]: Math.min(100, Math.max(0, value)) }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saveMsg.set('');
    try {
      await firstValueFrom(this.financeService.upsertBudget({
        householdId: this.householdId,
        income: this.income(),
        incomeCurrency: this.incomeCurrency(),
        goals: this.goals(),
      }));
      this.saveMsg.set('Orçamento guardado.');
    } catch {
      this.saveMsg.set('Erro ao guardar.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.financeService.getBudget(this.householdId));
      this.income.set(data.income);
      this.incomeCurrency.set(data.incomeCurrency);
      this.goals.set(data.goals as Record<string, number>);
    } catch {
      // ignore — default values already set
    } finally {
      this.loading.set(false);
    }
  }
}
