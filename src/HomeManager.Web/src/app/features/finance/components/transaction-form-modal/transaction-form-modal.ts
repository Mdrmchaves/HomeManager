import {
  Component, Input, Output, EventEmitter, OnInit, signal, computed, inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceStateService } from '../../../../core/services/finance-state.service';
import { FinanceTransaction, TransactionCategory } from '../../../../core/models/finance-transaction.model';
import { FinancePlanningItem } from '../../../../core/models/finance-planning.model';
import { FinanceRates, CATEGORY_LABELS, CATEGORY_COLORS, FinanceCategory, SUPPORTED_CURRENCIES } from '../../../../core/models/finance-budget.model';

const CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];
const CATEGORY_LABEL = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;
const CATEGORY_COLOR = (cat: string) => CATEGORY_COLORS[cat as FinanceCategory] ?? '';

@Component({
  selector: 'app-transaction-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      (click)="cancel()">
      <!-- Modal -->
      <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <h2 class="text-base font-semibold text-stone-800">
            {{ transaction ? 'Editar Transação' : 'Nova Transação' }}
          </h2>
          <button type="button" (click)="cancel()"
            class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3" id="tx-form">

            <!-- Type toggle -->
            <div class="flex gap-2">
              <button type="button" (click)="setType('expense')"
                class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                [class.bg-red-600]="form.value.type === 'expense'"
                [class.text-white]="form.value.type === 'expense'"
                [class.border-red-600]="form.value.type === 'expense'"
                [class.border-stone-200]="form.value.type !== 'expense'"
                [class.text-stone-600]="form.value.type !== 'expense'">
                Saída
              </button>
              <button type="button" (click)="setType('income')"
                class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                [class.bg-emerald-600]="form.value.type === 'income'"
                [class.text-white]="form.value.type === 'income'"
                [class.border-emerald-600]="form.value.type === 'income'"
                [class.border-stone-200]="form.value.type !== 'income'"
                [class.text-stone-600]="form.value.type !== 'income'">
                Entrada
              </button>
              <button type="button" (click)="setType('transfer')"
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
                <select formControlName="accountId" (change)="onTransferAccountChange()"
                  class="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                  [class.border-stone-200]="!(form.controls['accountId'].invalid && form.controls['accountId'].touched)"
                  [class.border-red-300]="form.controls['accountId'].invalid && form.controls['accountId'].touched">
                  <option [ngValue]="null" disabled>Conta de origem *</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }} · {{ acc.currency }}</option>
                  }
                </select>

                <select formControlName="toAccountId" (change)="onTransferAccountChange()"
                  class="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
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

                <div class="relative">
                  <input formControlName="amount" placeholder="Valor enviado *" type="number" step="0.01" min="0.01"
                    (input)="onTransferAmountChange()"
                    class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                  @if (fromAccountCurrency()) {
                    <span class="absolute right-3 top-2 text-xs text-stone-400">{{ fromAccountCurrency() }}</span>
                  }
                </div>

                <div class="relative">
                  <input formControlName="toAmount" placeholder="Valor recebido" type="number" step="0.01" min="0.01"
                    class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                  @if (toAccountCurrency()) {
                    <span class="absolute right-3 top-2 text-xs text-stone-400">{{ toAccountCurrency() }}</span>
                  }
                </div>

                <input formControlName="date" type="date"
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                <input formControlName="refMonth" type="month" placeholder="Mês ref."
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              @if (exchangeRateHint()) {
                <p class="text-xs text-blue-500">{{ exchangeRateHint() }}</p>
              }

            } @else {
              <!-- Income / Expense form -->

              <!-- Planning item selector (optional) -->
              @if (planningItems().length > 0) {
                <select formControlName="planningItemId" (change)="onPlanningItemChange()"
                  class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
                  <option [ngValue]="null">Vincular a compromisso (opcional)</option>
                  @for (item of planningItems(); track item.id) {
                    <option [value]="item.id">{{ item.description }} — {{ item.amount | number:'1.2-2' }} {{ item.currency }}</option>
                  }
                </select>
              }

              <select formControlName="accountId" (change)="onAccountChange()"
                class="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                [class.border-stone-200]="!(form.controls['accountId'].invalid && form.controls['accountId'].touched)"
                [class.border-red-300]="form.controls['accountId'].invalid && form.controls['accountId'].touched">
                <option [ngValue]="null" disabled>Selecionar conta *</option>
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.name }} · {{ acc.currency }}{{ acc.type === 'cc' ? ' (CC)' : '' }}</option>
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
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
                  @for (cur of currencies; track cur) {
                    <option [value]="cur">{{ cur }}</option>
                  }
                </select>
                <input formControlName="date" type="date"
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                <input formControlName="refMonth" type="month" placeholder="Mês ref."
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

            @if (error()) {
              <p class="text-xs text-red-500">{{ error() }}</p>
            }
          </form>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
          <button type="button" (click)="cancel()"
            class="flex-1 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="tx-form" [disabled]="saving() || form.invalid"
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
            {{ saving() ? 'A guardar…' : (transaction ? 'Actualizar' : 'Adicionar') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class TransactionFormModalComponent implements OnInit {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;
  @Input() transaction: FinanceTransaction | null = null;
  @Input() prefillPlanningItem?: { id: string; description: string; amount: number; currency: string; category?: string };
  @Output() closed = new EventEmitter<boolean>();

  private financeService = inject(FinanceService);
  private financeState = inject(FinanceStateService);
  private fb = inject(FormBuilder);

  saving = signal(false);
  error = signal('');
  exchangeRateHint = signal('');
  planningItems = signal<FinancePlanningItem[]>([]);

  // Read from shared state — no independent HTTP call
  accounts = this.financeState.accounts;
  rates = this.financeState.rates;

  readonly categories = CATEGORIES;
  readonly currencies = SUPPORTED_CURRENCIES;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly categoryColor = (cat: string) => CATEGORY_COLOR(cat);
  readonly categoryColorActive = (cat: string) => {
    const base = CATEGORY_COLOR(cat);
    return base.replace('100', '500').replace(/text-\w+-\d+/, 'text-white');
  };

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
    category: [null as string | null, Validators.required],
    planningItemId: [null as string | null],
  });

  // toSignal wraps form control Observable into a Signal so computed() tracks it reactively.
  // Must be declared after 'form' to avoid "used before initialization" error.
  private accountIdSignal = toSignal(this.form.controls['accountId'].valueChanges, { initialValue: null as string | null });

  fromAccountCurrency = computed(() => {
    const id = this.accountIdSignal();
    return id ? (this.accounts().find(a => a.id === id)?.currency ?? '') : '';
  });

  toAccountCurrency = computed(() => {
    const id = this.form.value.toAccountId;
    return id ? (this.accounts().find(a => a.id === id)?.currency ?? '') : '';
  });

  async ngOnInit(): Promise<void> {
    this.form.patchValue({ refMonth: this.month });

    // Load planning items for the selector
    try {
      const items = await firstValueFrom(this.financeService.getPlanningItems(this.householdId));
      this.planningItems.set(items);
    } catch {
      // non-critical — selector just won't show
    }

    if (this.transaction) {
      const tx = this.transaction;
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
        planningItemId: tx.planningItemId ?? null,
      });
      this.updateCategoryValidator();
    } else if (this.prefillPlanningItem) {
      const p = this.prefillPlanningItem;
      this.form.patchValue({
        planningItemId: p.id,
        description: p.description,
        amount: p.amount,
        currency: p.currency,
        category: p.category ?? null,
      });
    }
  }

  cancel(): void {
    this.closed.emit(false);
  }

  setType(type: string): void {
    if (type === 'transfer') {
      this.form.patchValue({ type, category: null, planningItemId: null });
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

  onAccountChange(): void {
    const id = this.form.value.accountId;
    const acc = this.accounts().find(a => a.id === id);
    if (acc) this.form.patchValue({ currency: acc.currency });
  }

  onPlanningItemChange(): void {
    const id = this.form.value.planningItemId;
    if (!id) return;
    const item = this.planningItems().find(p => p.id === id);
    if (!item) return;
    const current = this.form.getRawValue();
    // Only pre-fill if fields are at their defaults (not yet user-typed)
    const patch: Record<string, unknown> = {};
    if (!current.description) patch['description'] = item.description;
    if (!current.amount) patch['amount'] = item.amount;
    if (current.currency === 'BRL' || !current.currency) patch['currency'] = item.currency;
    if (!current.category && item.category) patch['category'] = item.category;
    if (Object.keys(patch).length > 0) this.form.patchValue(patch);
  }

  onTransferAccountChange(): void {
    const fromId = this.form.value.accountId;
    const toId = this.form.value.toAccountId;
    const amount = this.form.value.amount;
    if (fromId && toId && amount) {
      this.suggestToAmount(fromId, toId, amount);
    } else {
      this.exchangeRateHint.set('');
    }
  }

  onTransferAmountChange(): void {
    const fromId = this.form.value.accountId;
    const toId = this.form.value.toAccountId;
    const amount = this.form.value.amount;
    if (fromId && toId && amount) this.suggestToAmount(fromId, toId, amount);
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
    this.exchangeRateHint.set(`Taxa de câmbio estimada: 1 ${fromAcc.currency} ≈ ${effectiveRate} ${toAcc.currency}`);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const isTransfer = v.type === 'transfer';

    try {
      if (this.transaction) {
        const hadPlanningItem = this.transaction.planningItemId;
        const newPlanningItemId = v.planningItemId ?? undefined;
        await firstValueFrom(this.financeService.updateTransaction(this.transaction.id, {
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
          planningItemId: newPlanningItemId,
          clearPlanningItemId: !newPlanningItemId && !!hadPlanningItem,
        }));
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
          planningItemId: v.planningItemId ?? undefined,
        }));
      }
      this.closed.emit(true);
    } catch {
      this.error.set('Erro ao guardar transação. Tenta novamente.');
    } finally {
      this.saving.set(false);
    }
  }

}
