import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceTransaction, PagedResponse, TransactionCategory } from '../../../../core/models/finance-transaction.model';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import { FinanceRates } from '../../../../core/models/finance-budget.model';
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
              (click)="setType('expense')"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-red-600]="form.value.type === 'expense'"
              [class.text-white]="form.value.type === 'expense'"
              [class.border-red-600]="form.value.type === 'expense'"
              [class.border-stone-200]="form.value.type !== 'expense'"
              [class.text-stone-600]="form.value.type !== 'expense'">
              Saída
            </button>
            <button type="button"
              (click)="setType('income')"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-emerald-600]="form.value.type === 'income'"
              [class.text-white]="form.value.type === 'income'"
              [class.border-emerald-600]="form.value.type === 'income'"
              [class.border-stone-200]="form.value.type !== 'income'"
              [class.text-stone-600]="form.value.type !== 'income'">
              Entrada
            </button>
            <button type="button"
              (click)="setType('transfer')"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-blue-600]="form.value.type === 'transfer'"
              [class.text-white]="form.value.type === 'transfer'"
              [class.border-blue-600]="form.value.type === 'transfer'"
              [class.border-stone-200]="form.value.type !== 'transfer'"
              [class.text-stone-600]="form.value.type !== 'transfer'">
              Transferência
            </button>
          </div>

          @if (form.value.type === 'transfer') {
            <!-- Transfer form -->
            <div class="grid grid-cols-2 gap-3">
              <!-- From account -->
              <select formControlName="accountId" (change)="onTransferAccountChange()"
                class="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 transition-colors"
                [class.border-stone-200]="!(form.controls['accountId'].invalid && form.controls['accountId'].touched)"
                [class.border-red-300]="form.controls['accountId'].invalid && form.controls['accountId'].touched">
                <option [ngValue]="null" disabled>Conta de origem *</option>
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }} · {{ acc.currency }}</option>
                }
              </select>

              <!-- To account -->
              <select formControlName="toAccountId" (change)="onTransferAccountChange()"
                class="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 transition-colors"
                [class.border-stone-200]="!(form.controls['toAccountId'].invalid && form.controls['toAccountId'].touched)"
                [class.border-red-300]="form.controls['toAccountId'].invalid && form.controls['toAccountId'].touched">
                <option [ngValue]="null" disabled>Conta de destino *</option>
                @for (acc of accounts(); track acc.id) {
                  @if (acc.id !== form.value.accountId) {
                    <option [value]="acc.id">{{ acc.name }} · {{ acc.currency }}</option>
                  }
                }
              </select>

              <input formControlName="description" placeholder="Descrição *" type="text"
                class="col-span-2 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />

              <!-- Amount sent -->
              <div class="relative">
                <input formControlName="amount" placeholder="Valor enviado *" type="number" step="0.01" min="0.01"
                  (input)="onTransferAmountChange()"
                  class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                @if (fromAccountCurrency()) {
                  <span class="absolute right-3 top-2 text-xs text-stone-400">{{ fromAccountCurrency() }}</span>
                }
              </div>

              <!-- Amount received -->
              <div class="relative">
                <input formControlName="toAmount" placeholder="Valor recebido *" type="number" step="0.01" min="0.01"
                  class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                @if (toAccountCurrency()) {
                  <span class="absolute right-3 top-2 text-xs text-stone-400">{{ toAccountCurrency() }}</span>
                }
              </div>

              <input formControlName="date" type="date"
                class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />

              <input formControlName="refMonth" type="month"
                placeholder="Mês ref."
                class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
            </div>

            @if (exchangeRateHint()) {
              <p class="text-xs text-blue-500">{{ exchangeRateHint() }}</p>
            }

          } @else {
            <!-- Income / Expense form -->

            <!-- Account selector -->
            <select formControlName="accountId" (change)="onAccountChange()"
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
              @if (form.controls['category'].invalid && form.controls['category'].touched) {
                <p class="text-xs text-red-500">Seleciona uma categoria.</p>
              }
            }
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
                  @if (tx.type === 'transfer') {
                    <span class="text-xs text-stone-400">
                      {{ tx.accountName ?? '?' }} → {{ tx.toAccountName ?? '?' }}
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      Transferência
                    </span>
                  } @else {
                    @if (tx.accountName) {
                      <span class="text-xs text-stone-400">· {{ tx.accountName }}</span>
                    }
                    @if (tx.category) {
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium border" [class]="categoryColor(tx.category)">
                        {{ categoryLabel(tx.category) }}
                      </span>
                    }
                  }
                </div>
              </div>
              @if (tx.type === 'transfer') {
                <span class="text-sm font-semibold text-blue-600 shrink-0">
                  {{ tx.amount | number:'1.2-2' }} {{ tx.currency }}
                  @if (tx.toAmount && tx.toAccountId) {
                    <span class="text-stone-400 font-normal"> → </span>{{ tx.toAmount | number:'1.2-2' }}
                  }
                </span>
              } @else {
                <span class="text-sm font-semibold shrink-0"
                  [class.text-emerald-600]="tx.type === 'income'"
                  [class.text-red-600]="tx.type === 'expense'">
                  {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | number:'1.2-2' }} {{ tx.currency }}
                </span>
              }
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
  rates = signal<FinanceRates | null>(null);
  editingTx = signal<FinanceTransaction | null>(null);
  exchangeRateHint = signal('');

  readonly categories = CATEGORIES;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly categoryColor = (cat: string) => CATEGORY_COLOR(cat);
  readonly categoryColorActive = (cat: string) => {
    const base = CATEGORY_COLOR(cat);
    return base.replace('bg-', 'bg-').replace('100', '500').replace('text-', 'text-white border-').replace('border-', '');
  };

  fromAccountCurrency = computed(() => {
    const id = this.form.value.accountId;
    return id ? (this.accounts().find(a => a.id === id)?.currency ?? '') : '';
  });

  toAccountCurrency = computed(() => {
    const id = this.form.value.toAccountId;
    return id ? (this.accounts().find(a => a.id === id)?.currency ?? '') : '';
  });

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  form = this.fb.group({
    accountId: [null as string | null, Validators.required],
    toAccountId: [null as string | null],
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    toAmount: [null as number | null],
    currency: ['BRL', Validators.required],
    date: [this.today(), Validators.required],
    refMonth: [''],
    type: ['expense', Validators.required],
    category: [null as string | null, Validators.required], // required for expense (default type)
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

  onAccountChange(): void {
    const id = this.form.value.accountId;
    const acc = this.accounts().find(a => a.id === id);
    if (acc) this.form.patchValue({ currency: acc.currency });
  }

  setType(type: string): void {
    if (type === 'transfer') {
      this.form.patchValue({ type, category: null });
    } else {
      this.form.patchValue({ type, category: null, toAccountId: null, toAmount: null });
      this.exchangeRateHint.set('');
    }
    this.updateCategoryValidator();
  }

  private updateCategoryValidator(): void {
    const ctrl = this.form.controls['category'];
    if (this.form.value.type === 'expense') {
      ctrl.setValidators(Validators.required);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  onTransferAccountChange(): void {
    // Trigger computed re-evaluation by reading form value
    const fromId = this.form.value.accountId;
    const toId = this.form.value.toAccountId;
    const amount = this.form.value.amount;

    if (fromId && toId && amount) {
      this.suggestToAmount(fromId, toId, amount);
    } else if (fromId && toId) {
      // Just update the hint currency labels
      this.exchangeRateHint.set('');
    }
  }

  onTransferAmountChange(): void {
    const fromId = this.form.value.accountId;
    const toId = this.form.value.toAccountId;
    const amount = this.form.value.amount;
    if (fromId && toId && amount) {
      this.suggestToAmount(fromId, toId, amount);
    }
  }

  private suggestToAmount(fromId: string, toId: string, amount: number): void {
    const fromAcc = this.accounts().find(a => a.id === fromId);
    const toAcc = this.accounts().find(a => a.id === toId);
    if (!fromAcc || !toAcc) return;

    if (fromAcc.currency === toAcc.currency) {
      this.form.patchValue({ toAmount: amount });
      this.exchangeRateHint.set('');
      return;
    }

    const r = this.rates();
    const fromRate = r?.rates[fromAcc.currency] ?? 1;
    const toRate = r?.rates[toAcc.currency] ?? 1;
    const converted = Math.round((amount * fromRate) / toRate * 100) / 100;
    this.form.patchValue({ toAmount: converted });

    const effectiveRate = Math.round((fromRate / toRate) * 10000) / 10000;
    this.exchangeRateHint.set(
      `Taxa de câmbio estimada: 1 ${fromAcc.currency} ≈ ${effectiveRate} ${toAcc.currency}`
    );
  }

  startEdit(tx: FinanceTransaction): void {
    this.editingTx.set(tx);
    this.form.patchValue({
      accountId: tx.accountId ?? null,
      toAccountId: tx.toAccountId ?? null,
      description: tx.description,
      amount: tx.amount,
      toAmount: tx.toAmount ?? null,
      currency: tx.currency,
      date: tx.date,
      refMonth: tx.refMonth,
      type: tx.type,
      category: tx.category ?? null,
    });
    this.exchangeRateHint.set('');
    this.updateCategoryValidator();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingTx.set(null);
    this.exchangeRateHint.set('');
    this.form.reset({
      accountId: null,
      toAccountId: null,
      type: 'expense',
      currency: 'BRL',
      date: this.today(),
      refMonth: this.month,
    });
    this.updateCategoryValidator();
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    const v = this.form.getRawValue();
    const isTransfer = v.type === 'transfer';

    try {
      if (this.editingTx()) {
        await firstValueFrom(this.financeService.updateTransaction(this.editingTx()!.id, {
          accountId: v.accountId ?? undefined,
          description: v.description!,
          amount: v.amount!,
          currency: isTransfer ? (this.fromAccountCurrency() || v.currency!) : v.currency!,
          date: v.date!,
          type: v.type as 'income' | 'expense' | 'transfer',
          category: v.type === 'expense' && v.category ? v.category as TransactionCategory : undefined,
          refMonth: v.refMonth || undefined,
          toAccountId: isTransfer ? (v.toAccountId ?? undefined) : undefined,
          toAmount: isTransfer ? (v.toAmount ?? undefined) : undefined,
        }));
        this.cancelEdit();
      } else {
        await firstValueFrom(this.financeService.createTransaction({
          householdId: this.householdId,
          accountId: v.accountId ?? undefined,
          description: v.description!,
          amount: v.amount!,
          currency: isTransfer ? (this.fromAccountCurrency() || v.currency!) : v.currency!,
          date: v.date!,
          type: v.type as 'income' | 'expense' | 'transfer',
          category: v.type === 'expense' && v.category ? v.category as TransactionCategory : undefined,
          refMonth: v.refMonth || undefined,
          toAccountId: isTransfer ? (v.toAccountId ?? undefined) : undefined,
          toAmount: isTransfer ? (v.toAmount ?? undefined) : undefined,
        }));
        this.form.patchValue({ description: '', amount: null, toAmount: null, category: null, date: this.today() });
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
      const [accounts, rates] = await Promise.all([
        firstValueFrom(this.financeService.getAccounts(this.householdId)),
        firstValueFrom(this.financeService.getRates(this.householdId)),
      ]);
      this.accounts.set(accounts);
      this.rates.set(rates);
    } catch {
      // ignore — accounts/rates are non-critical
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
