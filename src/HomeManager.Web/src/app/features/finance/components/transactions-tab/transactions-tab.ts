import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceTransaction, PagedResponse, TransactionCategory } from '../../../../core/models/finance-transaction.model';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  FinanceCategory,
  SUPPORTED_CURRENCIES,
} from '../../../../core/models/finance-budget.model';

const CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];
const CATEGORY_LABEL = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;
const CATEGORY_COLOR = (cat: string) => CATEGORY_COLORS[cat as FinanceCategory] ?? '';

@Component({
  selector: 'app-transactions-tab',
  standalone: true,
  imports: [DecimalPipe, DatePipe, ReactiveFormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">

      <!-- Add / Edit form -->
      <div class="bg-white rounded-xl border border-stone-200 p-5">
        <h3 class="text-sm font-semibold text-stone-700 mb-4">
          {{ editingTx() ? 'Editar Transação' : 'Nova Transação' }}
        </h3>
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">

          <!-- Type toggle -->
          <div class="flex gap-2">
            <button type="button"
              (click)="form.patchValue({ type: 'expense' })"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-red-600]="form.value.type === 'expense'"
              [class.text-white]="form.value.type === 'expense'"
              [class.border-red-600]="form.value.type === 'expense'"
              [class.border-stone-200]="form.value.type !== 'expense'"
              [class.text-stone-600]="form.value.type !== 'expense'">
              Saída
            </button>
            <button type="button"
              (click)="form.patchValue({ type: 'income', category: null })"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-emerald-600]="form.value.type === 'income'"
              [class.text-white]="form.value.type === 'income'"
              [class.border-emerald-600]="form.value.type === 'income'"
              [class.border-stone-200]="form.value.type !== 'income'"
              [class.text-stone-600]="form.value.type !== 'income'">
              Entrada
            </button>
          </div>

          <!-- Account selector -->
          <select formControlName="accountId"
            class="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 transition-colors"
            [class.border-stone-200]="!(form.controls['accountId'].invalid && form.controls['accountId'].touched)"
            [class.border-red-300]="form.controls['accountId'].invalid && form.controls['accountId'].touched">
            <option [ngValue]="null" disabled>Selecionar conta *</option>
            @for (acc of accounts(); track acc.id) {
              <option [value]="acc.id">
                {{ acc.name }} · {{ acc.currency }}{{ acc.type === 'cc' ? ' (CC)' : '' }}
              </option>
            }
          </select>
          @if (accounts().length === 0) {
            <p class="text-xs text-amber-600">Cria uma conta no separador "Contas" primeiro.</p>
          }

          <div class="grid grid-cols-2 gap-3">
            <input formControlName="description" placeholder="Descrição *" type="text"
              class="col-span-2 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

            <input formControlName="amount" placeholder="Valor *" type="number" step="0.01" min="0.01"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

            <select formControlName="currency"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white">
              @for (cur of currencies; track cur) {
                <option [value]="cur">{{ cur }}</option>
              }
            </select>

            <input formControlName="date" type="date"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

            <input formControlName="refMonth" type="month"
              placeholder="Mês ref."
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          @if (form.value.type === 'expense') {
            <div class="flex flex-wrap gap-2">
              @for (cat of categories; track cat) {
                <button type="button"
                  (click)="form.patchValue({ category: cat })"
                  class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                  [class]="form.value.category === cat ? categoryColorActive(cat) : 'border-stone-200 text-stone-500'">
                  {{ categoryLabel(cat) }}
                </button>
              }
            </div>
          }

          <!-- Actions -->
          <div class="flex gap-2">
            @if (editingTx()) {
              <button type="button" (click)="cancelEdit()"
                class="flex-1 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
                Cancelar
              </button>
            }
            <button type="submit" [disabled]="saving() || form.invalid"
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
              {{ saving() ? 'A guardar…' : (editingTx() ? 'Actualizar' : 'Adicionar') }}
            </button>
          </div>

          @if (formError()) {
            <p class="text-red-600 text-xs">{{ formError() }}</p>
          }
        </form>
      </div>

      <!-- Transaction list -->
      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3,4,5]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-14"></div>
          }
        </div>
      } @else {
        <div class="space-y-2">
          @for (tx of transactions(); track tx.id) {
            <div
              class="bg-white rounded-xl border p-4 flex items-center gap-3 transition-colors"
              [class.border-emerald-300]="editingTx()?.id === tx.id"
              [class.bg-emerald-50]="editingTx()?.id === tx.id"
              [class.border-stone-200]="editingTx()?.id !== tx.id">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-stone-800 truncate">{{ tx.description }}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-stone-400">{{ tx.date | date:'dd/MM' }}</span>
                  @if (tx.accountName) {
                    <span class="text-xs text-stone-400">· {{ tx.accountName }}</span>
                  }
                  @if (tx.category) {
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium border" [class]="categoryColor(tx.category)">
                      {{ categoryLabel(tx.category) }}
                    </span>
                  }
                </div>
              </div>
              <span class="text-sm font-semibold shrink-0"
                [class.text-emerald-600]="tx.type === 'income'"
                [class.text-red-600]="tx.type === 'expense'">
                {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | number:'1.2-2' }} {{ tx.currency }}
              </span>
              <!-- Edit -->
              <button (click)="startEdit(tx)"
                class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <!-- Delete -->
              <button (click)="deleteTransaction(tx.id)"
                class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Apagar">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          }
          @if (transactions().length === 0) {
            <p class="text-center text-stone-400 text-sm py-8">Nenhuma transação neste mês.</p>
          }
        </div>
      }
    </div>
  `,
})
export class TransactionsTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  formError = signal('');
  pagedData = signal<PagedResponse<FinanceTransaction> | null>(null);
  transactions = computed(() => this.pagedData()?.items ?? []);
  accounts = signal<FinanceAccount[]>([]);
  editingTx = signal<FinanceTransaction | null>(null);

  readonly categories = CATEGORIES;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly categoryColor = (cat: string) => CATEGORY_COLOR(cat);
  readonly categoryColorActive = (cat: string) => {
    const base = CATEGORY_COLOR(cat);
    return base.replace('bg-', 'bg-').replace('100', '500').replace('text-', 'text-white border-').replace('border-', '');
  };

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  form = this.fb.group({
    accountId: [null as string | null, Validators.required],
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['BRL', Validators.required],
    date: [this.today(), Validators.required],
    refMonth: [''],
    type: ['expense', Validators.required],
    category: [null as string | null],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId'] || changes['month']) {
      this.form.patchValue({ refMonth: this.month });
      this.load();
    }
    if (changes['householdId']) {
      this.loadAccounts();
    }
  }

  startEdit(tx: FinanceTransaction): void {
    this.editingTx.set(tx);
    this.form.patchValue({
      accountId: tx.accountId ?? null,
      description: tx.description,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      refMonth: tx.refMonth,
      type: tx.type,
      category: tx.category ?? null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingTx.set(null);
    this.form.reset({
      accountId: null,
      type: 'expense',
      currency: 'BRL',
      date: this.today(),
      refMonth: this.month,
    });
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    const v = this.form.getRawValue();
    try {
      if (this.editingTx()) {
        await firstValueFrom(this.financeService.updateTransaction(this.editingTx()!.id, {
          accountId: v.accountId ?? undefined,
          description: v.description!,
          amount: v.amount!,
          currency: v.currency!,
          date: v.date!,
          type: v.type as 'income' | 'expense',
          category: v.type === 'expense' && v.category ? v.category as TransactionCategory : undefined,
          refMonth: v.refMonth || undefined,
        }));
        this.cancelEdit();
      } else {
        await firstValueFrom(this.financeService.createTransaction({
          householdId: this.householdId,
          accountId: v.accountId ?? undefined,
          description: v.description!,
          amount: v.amount!,
          currency: v.currency!,
          date: v.date!,
          type: v.type as 'income' | 'expense',
          category: v.type === 'expense' && v.category ? v.category as TransactionCategory : undefined,
          refMonth: v.refMonth || undefined,
        }));
        this.form.patchValue({ description: '', amount: null, category: null, date: this.today() });
      }
      await this.load();
    } catch {
      this.formError.set('Erro ao guardar transação.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    if (this.editingTx()?.id === id) this.cancelEdit();
    if (!confirm('Apagar esta transação?')) return;
    try {
      await firstValueFrom(this.financeService.deleteTransaction(id));
      await this.load();
    } catch {
      // ignore
    }
  }

  private async loadAccounts(): Promise<void> {
    if (!this.householdId) return;
    try {
      const data = await firstValueFrom(this.financeService.getAccounts(this.householdId));
      this.accounts.set(data);
    } catch {
      // ignore — accounts list is non-critical, form still works
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getTransactions(this.householdId, { month: this.month, pageSize: 100 })
      );
      this.pagedData.set(data);
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
    }
  }
}
