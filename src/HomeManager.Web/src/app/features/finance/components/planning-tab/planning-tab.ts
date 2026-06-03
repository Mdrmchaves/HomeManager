import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import {
  FinancePlanningItem,
  PlanningItemType,
} from '../../../../core/models/finance-planning.model';
import {
  CATEGORY_LABELS,
  FinanceCategory,
  SUPPORTED_CURRENCIES,
} from '../../../../core/models/finance-budget.model';

const CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];

@Component({
  selector: 'app-planning-tab',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">

      <!-- Summary card -->
      @if (items().length > 0) {
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-2">Estimativa mensal</p>
          @for (entry of monthlySummary(); track entry.currency) {
            <p class="text-lg font-bold text-emerald-900">
              {{ entry.total | number:'1.2-2' }} {{ entry.currency }}
            </p>
          }
          <p class="text-xs text-emerald-600 mt-1">{{ items().length }} compromisso{{ items().length !== 1 ? 's' : '' }} activo{{ items().length !== 1 ? 's' : '' }}</p>
        </div>
      }

      <!-- Add button / form toggle -->
      @if (!showForm()) {
        <button (click)="openForm()"
          class="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-dashed border-stone-200 text-stone-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
          + Novo compromisso
        </button>
      } @else {
        <!-- Add / Edit form -->
        <div class="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-stone-700">
              {{ editingId() ? 'Editar compromisso' : 'Novo compromisso' }}
            </h3>
            <button (click)="closeForm()" class="text-stone-400 hover:text-stone-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
            <!-- Description -->
            <input formControlName="description" placeholder="Descrição (ex: Aluguel, Netflix, Sofá)" type="text"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

            <!-- Amount + Currency -->
            <div class="flex gap-2">
              <input formControlName="amount" placeholder="Valor" type="number" step="0.01" min="0.01"
                class="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              <select formControlName="currency"
                class="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
                @for (cur of currencies; track cur) {
                  <option [value]="cur">{{ cur }}</option>
                }
              </select>
            </div>

            <!-- Day of month -->
            <input formControlName="dayOfMonth" placeholder="Dia de vencimento (1-31, opcional)" type="number" min="1" max="31"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

            <!-- Type toggle -->
            <div class="flex gap-2">
              <button type="button" (click)="setType('fixed')"
                class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                [class.bg-stone-800]="form.value.type === 'fixed'"
                [class.text-white]="form.value.type === 'fixed'"
                [class.border-stone-800]="form.value.type === 'fixed'"
                [class.border-stone-200]="form.value.type !== 'fixed'"
                [class.text-stone-500]="form.value.type !== 'fixed'">
                Recorrente
              </button>
              <button type="button" (click)="setType('installment')"
                class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                [class.bg-stone-800]="form.value.type === 'installment'"
                [class.text-white]="form.value.type === 'installment'"
                [class.border-stone-800]="form.value.type === 'installment'"
                [class.border-stone-200]="form.value.type !== 'installment'"
                [class.text-stone-500]="form.value.type !== 'installment'">
                Parcelado
              </button>
            </div>

            <!-- Installment fields -->
            @if (form.value.type === 'installment') {
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-stone-500 mb-1">Total de parcelas</label>
                  <input formControlName="totalInstallments" type="number" min="1" placeholder="ex: 12"
                    class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label class="block text-xs text-stone-500 mb-1">Parcelas pagas</label>
                  <input formControlName="installmentsPaid" type="number" min="0" placeholder="ex: 0"
                    class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            }

            <!-- Category pills -->
            <div class="flex flex-wrap gap-1.5">
              <button type="button" (click)="form.patchValue({ category: null })"
                class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                [class.bg-stone-800]="!form.value.category"
                [class.text-white]="!form.value.category"
                [class.border-stone-800]="!form.value.category"
                [class.border-stone-200]="form.value.category"
                [class.text-stone-500]="form.value.category">
                Geral
              </button>
              @for (cat of categories; track cat) {
                <button type="button" (click)="form.patchValue({ category: cat })"
                  class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                  [class.bg-emerald-600]="form.value.category === cat"
                  [class.text-white]="form.value.category === cat"
                  [class.border-emerald-600]="form.value.category === cat"
                  [class.border-stone-200]="form.value.category !== cat"
                  [class.text-stone-500]="form.value.category !== cat">
                  {{ label(cat) }}
                </button>
              }
            </div>

            <button type="submit" [disabled]="saving() || form.invalid"
              class="w-full py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
              {{ saving() ? 'A guardar…' : (editingId() ? 'Guardar alterações' : 'Adicionar') }}
            </button>
          </form>
        </div>
      }

      <!-- Items list -->
      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-16"></div>
          }
        </div>
      } @else if (items().length === 0 && !showForm()) {
        <div class="text-center py-12">
          <p class="text-stone-400 text-sm">Nenhum compromisso registado.</p>
          <p class="text-stone-400 text-xs mt-1">Adiciona as tuas contas fixas e parcelamentos.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (item of items(); track item.id) {
            <div class="bg-white rounded-xl border border-stone-200 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-medium text-stone-800">{{ item.description }}</p>
                    @if (item.type === 'installment') {
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {{ item.installmentsPaid }}/{{ item.totalInstallments }} parcelas
                      </span>
                    }
                    @if (item.category) {
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                        {{ label(item.category) }}
                      </span>
                    }
                  </div>
                  <p class="text-sm font-semibold text-stone-700 mt-0.5">
                    {{ item.amount | number:'1.2-2' }} {{ item.currency }}
                    @if (item.dayOfMonth) { <span class="text-xs font-normal text-stone-400">· Dia {{ item.dayOfMonth }}</span> }
                  </p>
                  @if (item.type === 'installment' && item.totalInstallments) {
                    <p class="text-xs text-stone-400 mt-0.5">
                      {{ item.totalInstallments - item.installmentsPaid }} restantes
                      @if (endMonth(item); as end) { · término {{ end }} }
                    </p>
                  }
                </div>
                <div class="flex gap-1 shrink-0">
                  <button (click)="startEdit(item)"
                    class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deleteItem(item.id)"
                    class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PlanningTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;

  private financeService = inject(FinanceService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  items = signal<FinancePlanningItem[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);

  readonly categories = CATEGORIES;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly label = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;

  monthlySummary = computed(() => {
    const totals = new Map<string, number>();
    for (const item of this.items()) {
      totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([currency, total]) => ({ currency, total }));
  });

  form = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['BRL', Validators.required],
    dayOfMonth: [null as number | null],
    type: ['fixed' as PlanningItemType, Validators.required],
    totalInstallments: [null as number | null],
    installmentsPaid: [0],
    category: [null as string | null],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId']) this.load();
  }

  openForm(): void {
    this.editingId.set(null);
    this.form.reset({ currency: 'BRL', type: 'fixed', installmentsPaid: 0, category: null, dayOfMonth: null, totalInstallments: null });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  setType(type: PlanningItemType): void {
    this.form.patchValue({ type });
    if (type === 'fixed') {
      this.form.patchValue({ totalInstallments: null, installmentsPaid: 0 });
    }
  }

  startEdit(item: FinancePlanningItem): void {
    this.editingId.set(item.id);
    this.form.setValue({
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      dayOfMonth: item.dayOfMonth ?? null,
      type: item.type,
      totalInstallments: item.totalInstallments ?? null,
      installmentsPaid: item.installmentsPaid,
      category: item.category ?? null,
    });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  endMonth(item: FinancePlanningItem): string | null {
    if (!item.totalInstallments) return null;
    const remaining = item.totalInstallments - item.installmentsPaid;
    if (remaining <= 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + remaining);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    try {
      if (this.editingId()) {
        await firstValueFrom(this.financeService.updatePlanningItem(this.editingId()!, {
          description: v.description!,
          amount: v.amount!,
          currency: v.currency!,
          category: v.category ?? undefined,
          type: v.type as PlanningItemType,
          dayOfMonth: v.dayOfMonth ?? undefined,
          totalInstallments: v.type === 'installment' ? (v.totalInstallments ?? undefined) : undefined,
          installmentsPaid: v.type === 'installment' ? (v.installmentsPaid ?? 0) : 0,
          isActive: true,
        }));
      } else {
        await firstValueFrom(this.financeService.createPlanningItem({
          householdId: this.householdId,
          description: v.description!,
          amount: v.amount!,
          currency: v.currency!,
          category: v.category ?? undefined,
          type: v.type as PlanningItemType,
          dayOfMonth: v.dayOfMonth ?? undefined,
          totalInstallments: v.type === 'installment' ? (v.totalInstallments ?? undefined) : undefined,
          installmentsPaid: v.type === 'installment' ? (v.installmentsPaid ?? 0) : undefined,
        }));
      }
      this.closeForm();
      await this.load();
    } catch {
      // ignore
    } finally {
      this.saving.set(false);
    }
  }

  async deleteItem(id: string): Promise<void> {
    if (!confirm('Remover este compromisso?')) return;
    try {
      await firstValueFrom(this.financeService.deletePlanningItem(id));
      await this.load();
    } catch {
      // ignore
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.financeService.getPlanningItems(this.householdId));
      this.items.set(data);
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
    }
  }
}
