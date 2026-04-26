import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceTemplate } from '../../../../core/models/finance-transaction.model';
import {
  CATEGORY_LABELS,
  FinanceCategory,
  SUPPORTED_CURRENCIES,
} from '../../../../core/models/finance-budget.model';

const CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];

@Component({
  selector: 'app-recurring-tab',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      <!-- Apply button -->
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-emerald-800">Aplicar recorrentes para {{ month }}</p>
          <p class="text-xs text-emerald-600 mt-0.5">Gera transações para cada template activo.</p>
        </div>
        <button (click)="apply()" [disabled]="applying()"
          class="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
          {{ applying() ? 'A aplicar…' : 'Aplicar' }}
        </button>
      </div>
      @if (applyResult()) {
        <p class="text-sm text-stone-600">{{ applyResult() }}</p>
      }

      <!-- Add template form -->
      <div class="bg-white rounded-xl border border-stone-200 p-5">
        <h3 class="text-sm font-semibold text-stone-700 mb-4">Novo Template</h3>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
          <input formControlName="description" placeholder="Descrição" type="text"
            class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

          <div class="grid grid-cols-3 gap-3">
            <input formControlName="amount" placeholder="Valor" type="number" step="0.01" min="0.01"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
            <select formControlName="currency"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
              @for (cur of currencies; track cur) {
                <option [value]="cur">{{ cur }}</option>
              }
            </select>
            <input formControlName="dayOfMonth" placeholder="Dia (1-31)" type="number" min="1" max="31"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button"
              (click)="form.patchValue({ category: null })"
              class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
              [class.bg-stone-800]="!form.value.category"
              [class.text-white]="!form.value.category"
              [class.border-stone-800]="!form.value.category"
              [class.border-stone-200]="form.value.category"
              [class.text-stone-500]="form.value.category">
              Entrada
            </button>
            @for (cat of categories; track cat) {
              <button type="button"
                (click)="form.patchValue({ category: cat })"
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
            {{ saving() ? 'A guardar…' : 'Guardar Template' }}
          </button>
        </form>
      </div>

      <!-- Template list -->
      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-14"></div>
          }
        </div>
      } @else {
        <div class="space-y-2">
          @for (tpl of templates(); track tpl.id) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-stone-800 truncate">{{ tpl.description }}</p>
                <p class="text-xs text-stone-400 mt-0.5">
                  Dia {{ tpl.dayOfMonth }} · {{ tpl.amount | number:'1.2-2' }} {{ tpl.currency }}
                  @if (tpl.category) { · {{ label(tpl.category) }} }
                  @else { · Entrada }
                </p>
              </div>
              <button (click)="deleteTemplate(tpl.id)"
                class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          }
          @if (templates().length === 0) {
            <p class="text-center text-stone-400 text-sm py-8">Nenhum template criado.</p>
          }
        </div>
      }
    </div>
  `,
})
export class RecurringTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  applying = signal(false);
  templates = signal<FinanceTemplate[]>([]);
  applyResult = signal('');

  readonly categories = CATEGORIES;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly label = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;

  form = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['BRL', Validators.required],
    dayOfMonth: [null as number | null, [Validators.required, Validators.min(1), Validators.max(31)]],
    category: [null as string | null],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId']) this.load();
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      await firstValueFrom(this.financeService.createTemplate({
        householdId: this.householdId,
        description: v.description!,
        amount: v.amount!,
        currency: v.currency!,
        dayOfMonth: v.dayOfMonth!,
        category: v.category as any ?? undefined,
      }));
      this.form.patchValue({ description: '', amount: null, dayOfMonth: null, category: null });
      await this.load();
    } catch {
      // ignore
    } finally {
      this.saving.set(false);
    }
  }

  async apply(): Promise<void> {
    this.applying.set(true);
    this.applyResult.set('');
    try {
      const result = await firstValueFrom(this.financeService.applyTemplates(this.householdId, this.month));
      this.applyResult.set(`${result.generated} transações geradas, ${result.skipped} já existiam.`);
    } catch {
      this.applyResult.set('Erro ao aplicar templates.');
    } finally {
      this.applying.set(false);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!confirm('Apagar este template?')) return;
    try {
      await firstValueFrom(this.financeService.deleteTemplate(id));
      await this.load();
    } catch {
      // ignore
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.financeService.getTemplates(this.householdId));
      this.templates.set(data);
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
    }
  }
}
