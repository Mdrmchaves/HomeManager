import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import { ImportResult, TransactionCategory } from '../../../../core/models/finance-transaction.model';

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedTransaction {
  accountId?: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  type: 'income' | 'expense';
  category?: TransactionCategory;
  refMonth?: string;
}

interface ParsedAccount {
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  dueDay?: number;
  limit?: number;
}

interface ValidationError {
  index: number;
  field: string;
  message: string;
}

type ImportMode = 'transactions' | 'accounts';

const VALID_TYPES = ['income', 'expense'];
const VALID_CATEGORIES = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];
const VALID_CURRENCIES = ['BRL', 'EUR', 'USD', 'PYG'];
const VALID_ACCOUNT_TYPES = ['account', 'cc'];

// ── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-import-modal',
  standalone: true,
  imports: [],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      (click)="onBackdropClick($event)"
    >
      <!-- Modal -->
      <div
        class="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 class="text-base font-semibold text-stone-800">Importar</h2>
          <button
            (click)="close()"
            class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body (scrollable) -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <!-- Mode toggle -->
          <div class="flex rounded-xl border border-stone-200 overflow-hidden text-sm font-medium">
            <button
              type="button"
              (click)="setMode('transactions')"
              class="flex-1 py-2 transition-colors"
              [class.bg-emerald-600]="mode() === 'transactions'"
              [class.text-white]="mode() === 'transactions'"
              [class.text-stone-600]="mode() !== 'transactions'"
              [class.hover:bg-stone-50]="mode() !== 'transactions'"
            >Transações</button>
            <button
              type="button"
              (click)="setMode('accounts')"
              class="flex-1 py-2 transition-colors border-l border-stone-200"
              [class.bg-emerald-600]="mode() === 'accounts'"
              [class.text-white]="mode() === 'accounts'"
              [class.text-stone-600]="mode() !== 'accounts'"
              [class.hover:bg-stone-50]="mode() !== 'accounts'"
            >Contas e Cartões</button>
          </div>

          <!-- Format instructions (collapsible) -->
          <div class="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden">
            <button
              type="button"
              (click)="showFormat.set(!showFormat())"
              class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <span>Formato do JSON</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-stone-400 transition-transform"
                [class.rotate-180]="showFormat()"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            @if (showFormat()) {
              <div class="px-4 pb-4 space-y-2 text-xs text-stone-600">
                @if (mode() === 'transactions') {
                  <p>Array de objectos com os seguintes campos:</p>
                  <pre class="bg-white border border-stone-200 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed">{{ txFormatExample }}</pre>
                  <p class="text-stone-500">
                    <strong>type</strong>: <code>income</code> ou <code>expense</code><br>
                    <strong>category</strong>: <code>lf</code> cf co mt pr es (só para expense; null para income)<br>
                    <strong>currency</strong>: <code>BRL</code> EUR USD PYG<br>
                    <strong>date</strong>: <code>YYYY-MM-DD</code><br>
                    <strong>refMonth</strong>: <code>YYYY-MM</code> (opcional — calculado automaticamente para CC)
                  </p>
                } @else {
                  <p>Array de objectos com os seguintes campos:</p>
                  <pre class="bg-white border border-stone-200 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed">{{ accFormatExample }}</pre>
                  <p class="text-stone-500">
                    <strong>type</strong>: <code>account</code> (conta) ou <code>cc</code> (cartão de crédito)<br>
                    <strong>currency</strong>: <code>BRL</code> EUR USD PYG<br>
                    <strong>closeDay</strong>: dia de fecho da fatura (só para CC)<br>
                    <strong>dueDay</strong>: dia de vencimento (só para CC)<br>
                    <strong>limit</strong>: limite do cartão (só para CC, opcional)
                  </p>
                }
              </div>
            }
          </div>

          <!-- Account IDs reference (transactions mode only) -->
          @if (mode() === 'transactions' && accounts().length > 0) {
            <div class="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p class="text-xs font-medium text-blue-700 mb-2">IDs das tuas contas (para accountId):</p>
              <div class="space-y-1">
                @for (acc of accounts(); track acc.id) {
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-blue-800 font-medium">{{ acc.name }}</span>
                    <span class="text-xs text-blue-400">—</span>
                    <code
                      class="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                      (click)="copyId(acc.id)"
                      title="Clica para copiar"
                    >{{ acc.id }}</code>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Textarea -->
          <div>
            <label class="block text-xs font-medium text-stone-600 mb-1.5">
              Cole o JSON aqui
              @if (parsedCount() > 0) {
                <span class="ml-2 text-emerald-600 font-normal">
                  {{ parsedCount() }} {{ mode() === 'transactions' ? 'transação(ões)' : 'conta(s)' }} detectada(s)
                </span>
              }
            </label>
            <textarea
              [value]="rawJson()"
              (input)="onJsonInput($any($event.target).value)"
              rows="10"
              [placeholder]="placeholder()"
              class="w-full px-3 py-2.5 border rounded-xl text-sm font-mono resize-none focus:outline-none transition-colors"
              [class.border-stone-200]="!parseError() && validationErrors().length === 0"
              [class.focus:border-emerald-500]="!parseError() && validationErrors().length === 0"
              [class.border-red-300]="parseError() || validationErrors().length > 0"
              [class.bg-red-50]="parseError() || validationErrors().length > 0"
            ></textarea>
          </div>

          <!-- Parse error -->
          @if (parseError()) {
            <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p class="text-xs font-medium text-red-700">JSON inválido:</p>
              <p class="text-xs text-red-600 mt-1 font-mono">{{ parseError() }}</p>
            </div>
          }

          <!-- Validation errors -->
          @if (validationErrors().length > 0) {
            <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
              <p class="text-xs font-medium text-amber-700">{{ validationErrors().length }} erro(s) de validação:</p>
              @for (err of validationErrors().slice(0, 5); track $index) {
                <p class="text-xs text-amber-700">• Registo {{ err.index + 1 }}: <strong>{{ err.field }}</strong> — {{ err.message }}</p>
              }
              @if (validationErrors().length > 5) {
                <p class="text-xs text-amber-600">... e mais {{ validationErrors().length - 5 }} erro(s)</p>
              }
            </div>
          }

          <!-- Import result -->
          @if (importResult()) {
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p class="text-sm font-medium text-emerald-700">
                ✓ {{ importResult()!.imported }} {{ mode() === 'transactions' ? 'transação(ões)' : 'conta(s)' }} importada(s)
                @if (importResult()!.skipped > 0) {
                  <span class="text-emerald-600 font-normal">, {{ importResult()!.skipped }} ignorada(s)</span>
                }
              </p>
            </div>
          }

          @if (importError()) {
            <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p class="text-xs text-red-700">{{ importError() }}</p>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-stone-200 flex items-center gap-3">
          <button
            (click)="close()"
            class="px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            {{ importResult() ? 'Fechar' : 'Cancelar' }}
          </button>
          <button
            (click)="importData()"
            [disabled]="importing() || parsedCount() === 0 || validationErrors().length > 0 || !!parseError()"
            class="flex-1 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            @if (importing()) {
              A importar…
            } @else if (parsedCount() > 0 && validationErrors().length === 0) {
              Importar {{ parsedCount() }} {{ mode() === 'transactions' ? 'transação(ões)' : 'conta(s)' }}
            } @else {
              Importar
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ImportModalComponent implements OnInit {
  @Input({ required: true }) householdId!: string;
  @Output() closed = new EventEmitter<boolean>(); // true = imported something

  private financeService = inject(FinanceService);

  mode = signal<ImportMode>('transactions');
  showFormat = signal(false);
  rawJson = signal('');
  parseError = signal('');
  validationErrors = signal<ValidationError[]>([]);
  parsedTransactions = signal<ParsedTransaction[]>([]);
  parsedAccounts = signal<ParsedAccount[]>([]);
  parsedCount = computed(() =>
    this.mode() === 'transactions'
      ? this.parsedTransactions().length
      : this.parsedAccounts().length
  );
  accounts = signal<FinanceAccount[]>([]);
  importing = signal(false);
  importResult = signal<ImportResult | null>(null);
  importError = signal('');

  readonly txFormatExample = `[
  {
    "accountId": "uuid-da-conta (opcional)",
    "description": "Salário",
    "amount": 1500.00,
    "currency": "EUR",
    "date": "2026-04-01",
    "type": "income",
    "category": null,
    "refMonth": "2026-04"
  },
  {
    "description": "Renda",
    "amount": 800.00,
    "currency": "EUR",
    "date": "2026-04-05",
    "type": "expense",
    "category": "cf"
  }
]`;

  readonly accFormatExample = `[
  {
    "name": "Conta Principal",
    "currency": "BRL",
    "type": "account"
  },
  {
    "name": "Cartão Nubank",
    "currency": "BRL",
    "type": "cc",
    "closeDay": 3,
    "dueDay": 10,
    "limit": 5000.00
  },
  {
    "name": "Conta Euro",
    "currency": "EUR",
    "type": "account"
  }
]`;

  placeholder = computed(() =>
    this.mode() === 'transactions'
      ? '[{\n  "description": "Salário",\n  "amount": 1500,\n  "currency": "EUR",\n  "date": "2026-04-01",\n  "type": "income"\n}]'
      : '[{\n  "name": "Conta Principal",\n  "currency": "BRL",\n  "type": "account"\n}]'
  );

  async ngOnInit(): Promise<void> {
    try {
      const accs = await firstValueFrom(this.financeService.getAccounts(this.householdId));
      this.accounts.set(accs);
    } catch {
      // non-critical
    }
  }

  setMode(mode: ImportMode): void {
    this.mode.set(mode);
    this.reset();
  }

  private reset(): void {
    this.rawJson.set('');
    this.parseError.set('');
    this.validationErrors.set([]);
    this.parsedTransactions.set([]);
    this.parsedAccounts.set([]);
    this.importResult.set(null);
    this.importError.set('');
  }

  onJsonInput(value: string): void {
    this.rawJson.set(value);
    this.importResult.set(null);
    this.importError.set('');
    this.parseError.set('');
    this.validationErrors.set([]);
    this.parsedTransactions.set([]);
    this.parsedAccounts.set([]);

    if (!value.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (e: unknown) {
      this.parseError.set(e instanceof Error ? e.message : 'Erro de parse');
      return;
    }

    if (!Array.isArray(parsed)) {
      this.parseError.set('O JSON deve ser um array [ ... ]');
      return;
    }

    if (this.mode() === 'transactions') {
      this.parseTransactions(parsed);
    } else {
      this.parseAccounts(parsed);
    }
  }

  private parseTransactions(parsed: unknown[]): void {
    const errors: ValidationError[] = [];
    const transactions: ParsedTransaction[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i] as Record<string, unknown>;

      if (!item['description'] || typeof item['description'] !== 'string') {
        errors.push({ index: i, field: 'description', message: 'Obrigatório e deve ser string' });
      }
      if (!item['amount'] || typeof item['amount'] !== 'number' || (item['amount'] as number) <= 0) {
        errors.push({ index: i, field: 'amount', message: 'Obrigatório, número > 0' });
      }
      if (!item['currency'] || !VALID_CURRENCIES.includes(item['currency'] as string)) {
        errors.push({ index: i, field: 'currency', message: `Deve ser um de: ${VALID_CURRENCIES.join(', ')}` });
      }
      if (!item['date'] || typeof item['date'] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item['date'] as string)) {
        errors.push({ index: i, field: 'date', message: 'Obrigatório, formato YYYY-MM-DD' });
      }
      if (!item['type'] || !VALID_TYPES.includes(item['type'] as string)) {
        errors.push({ index: i, field: 'type', message: `Deve ser 'income' ou 'expense'` });
      }
      if (item['category'] && !VALID_CATEGORIES.includes(item['category'] as string)) {
        errors.push({ index: i, field: 'category', message: `Deve ser um de: ${VALID_CATEGORIES.join(', ')}` });
      }
      if (item['refMonth'] && !/^\d{4}-\d{2}$/.test(item['refMonth'] as string)) {
        errors.push({ index: i, field: 'refMonth', message: 'Formato YYYY-MM' });
      }

      if (errors.filter(e => e.index === i).length === 0) {
        transactions.push({
          accountId: item['accountId'] as string | undefined,
          description: item['description'] as string,
          amount: item['amount'] as number,
          currency: item['currency'] as string,
          date: item['date'] as string,
          type: item['type'] as 'income' | 'expense',
          category: item['category'] as TransactionCategory | undefined,
          refMonth: item['refMonth'] as string | undefined,
        });
      }
    }

    this.validationErrors.set(errors);
    this.parsedTransactions.set(errors.length === 0 ? transactions : []);
  }

  private parseAccounts(parsed: unknown[]): void {
    const errors: ValidationError[] = [];
    const accounts: ParsedAccount[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i] as Record<string, unknown>;

      if (!item['name'] || typeof item['name'] !== 'string' || !(item['name'] as string).trim()) {
        errors.push({ index: i, field: 'name', message: 'Obrigatório e deve ser string' });
      }
      if (!item['currency'] || !VALID_CURRENCIES.includes(item['currency'] as string)) {
        errors.push({ index: i, field: 'currency', message: `Deve ser um de: ${VALID_CURRENCIES.join(', ')}` });
      }
      if (!item['type'] || !VALID_ACCOUNT_TYPES.includes(item['type'] as string)) {
        errors.push({ index: i, field: 'type', message: `Deve ser 'account' ou 'cc'` });
      }
      if (item['type'] === 'cc') {
        if (item['closeDay'] !== undefined && item['closeDay'] !== null) {
          const d = item['closeDay'] as number;
          if (typeof d !== 'number' || d < 1 || d > 31) {
            errors.push({ index: i, field: 'closeDay', message: 'Deve ser número entre 1 e 31' });
          }
        }
        if (item['dueDay'] !== undefined && item['dueDay'] !== null) {
          const d = item['dueDay'] as number;
          if (typeof d !== 'number' || d < 1 || d > 31) {
            errors.push({ index: i, field: 'dueDay', message: 'Deve ser número entre 1 e 31' });
          }
        }
      }

      if (errors.filter(e => e.index === i).length === 0) {
        const isCC = item['type'] === 'cc';
        accounts.push({
          name: (item['name'] as string).trim(),
          currency: item['currency'] as string,
          type: item['type'] as 'account' | 'cc',
          closeDay: isCC ? (item['closeDay'] as number | undefined) : undefined,
          dueDay: isCC ? (item['dueDay'] as number | undefined) : undefined,
          limit: isCC ? (item['limit'] as number | undefined) : undefined,
        });
      }
    }

    this.validationErrors.set(errors);
    this.parsedAccounts.set(errors.length === 0 ? accounts : []);
  }

  async importData(): Promise<void> {
    this.importing.set(true);
    this.importError.set('');
    this.importResult.set(null);

    try {
      let result: ImportResult;

      if (this.mode() === 'transactions') {
        const txs = this.parsedTransactions();
        if (txs.length === 0) return;
        const requests = txs.map(tx => ({ ...tx, householdId: this.householdId }));
        result = await firstValueFrom(
          this.financeService.importTransactions(this.householdId, requests)
        );
      } else {
        const accs = this.parsedAccounts();
        if (accs.length === 0) return;
        result = await firstValueFrom(
          this.financeService.importAccounts(this.householdId, accs)
        );
      }

      this.importResult.set(result);
      this.rawJson.set('');
      this.parsedTransactions.set([]);
      this.parsedAccounts.set([]);
    } catch {
      this.importError.set('Erro ao importar. Verifica a ligação e tenta novamente.');
    } finally {
      this.importing.set(false);
    }
  }

  async copyId(id: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // ignore
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  close(): void {
    this.closed.emit(this.importResult() !== null);
  }
}
