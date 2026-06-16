import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceStateService } from '../../../../core/services/finance-state.service';
import { FinanceTransaction, PagedResponse } from '../../../../core/models/finance-transaction.model';
import { CATEGORY_LABELS, CATEGORY_COLORS, FinanceCategory } from '../../../../core/models/finance-budget.model';
import { TransactionFormModalComponent } from '../transaction-form-modal/transaction-form-modal';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';

const CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];
const CATEGORY_LABEL = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;
const CATEGORY_COLOR = (cat: string) => CATEGORY_COLORS[cat as FinanceCategory] ?? '';

@Component({
  selector: 'app-transactions-tab',
  standalone: true,
  imports: [DecimalPipe, DatePipe, TransactionFormModalComponent, ConfirmModalComponent],
  template: `
    <div class="p-4 md:p-8 space-y-4 max-w-3xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-stone-700">Transações</h2>
        <button type="button" (click)="openModal(null)" [disabled]="loading()"
          class="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          + Nova Transação
        </button>
      </div>

      <!-- Error banner -->
      @if (error()) {
        <div class="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {{ error() }}
          <button (click)="error.set('')" class="ml-3 text-red-400 hover:text-red-600 shrink-0">✕</button>
        </div>
      }

      <!-- Filter panel -->
      <div class="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
        <!-- Search -->
        <input
          type="text"
          placeholder="🔍  Pesquisar por descrição..."
          class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          [value]="searchText()"
          (input)="searchText.set($any($event.target).value)" />

        <!-- Type chips -->
        <div class="flex flex-wrap gap-2">
          @for (opt of typeOptions; track opt.value) {
            <button type="button"
              (click)="filterType.set(opt.value)"
              class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
              [class.bg-stone-800]="filterType() === opt.value"
              [class.text-white]="filterType() === opt.value"
              [class.border-stone-800]="filterType() === opt.value"
              [class.border-stone-200]="filterType() !== opt.value"
              [class.text-stone-500]="filterType() !== opt.value">
              {{ opt.label }}
            </button>
          }
        </div>

        <!-- Account dropdown -->
        <select class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
          [value]="filterAccount()"
          (change)="filterAccount.set($any($event.target).value)">
          <option value="">Todas as contas</option>
          @for (acc of accounts(); track acc.id) {
            <option [value]="acc.id">{{ acc.name }}</option>
          }
        </select>

        <!-- Category chips (hidden for income and transfer) -->
        @if (filterType() !== 'income' && filterType() !== 'transfer') {
          <div class="flex flex-wrap gap-2">
            <button type="button"
              (click)="filterCategory.set('')"
              class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
              [class.bg-stone-800]="filterCategory() === ''"
              [class.text-white]="filterCategory() === ''"
              [class.border-stone-800]="filterCategory() === ''"
              [class.border-stone-200]="filterCategory() !== ''"
              [class.text-stone-500]="filterCategory() !== ''">
              Todas
            </button>
            @for (cat of categories; track cat) {
              <button type="button"
                (click)="filterCategory.set(cat)"
                class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                [class]="filterCategory() === cat ? categoryColorActive(cat) : 'border-stone-200 text-stone-500'">
                {{ categoryLabel(cat) }}
              </button>
            }
          </div>
        }
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
          @for (tx of filteredTransactions(); track tx.id) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-stone-800 truncate">{{ tx.description }}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span class="text-xs text-stone-400">{{ tx.date | date:'dd/MM' }}</span>
                  @if (tx.type === 'transfer') {
                    <span class="text-xs text-stone-400">{{ tx.accountName ?? '?' }} → {{ tx.toAccountName ?? '?' }}</span>
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Transferência</span>
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
              <button (click)="openModal(tx)"
                [disabled]="deletingId() !== null"
                class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <!-- Delete -->
              <button (click)="deleteTransaction(tx.id)"
                [disabled]="deletingId() !== null"
                class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Apagar">
                @if (deletingId() === tx.id) {
                  <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                }
              </button>
            </div>
          }
          @if (!loading() && filteredTransactions().length === 0) {
            <p class="text-center text-stone-400 text-sm py-8">
              {{ transactions().length === 0 ? 'Nenhuma transação neste mês.' : 'Nenhum resultado para os filtros aplicados.' }}
            </p>
          }
        </div>
      }
    </div>

    <!-- Transaction form modal -->
    @if (showModal()) {
      <app-transaction-form-modal
        [householdId]="householdId"
        [month]="month"
        [transaction]="modalTx()"
        (closed)="onModalClosed($event)"
      />
    }

    <!-- Confirm modal -->
    @if (confirmDeleteId()) {
      <app-confirm-modal
        title="Apagar transação"
        message="Tens a certeza que queres apagar esta transação? Esta acção é irreversível."
        confirmLabel="Apagar"
        [destructive]="true"
        (confirmed)="doDelete()"
        (cancelled)="confirmDeleteId.set(null)"
      />
    }
  `,
})
export class TransactionsTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  private financeState = inject(FinanceStateService);

  loading = signal(false);
  error = signal('');
  deletingId = signal<string | null>(null);
  pagedData = signal<PagedResponse<FinanceTransaction> | null>(null);
  transactions = computed(() => this.pagedData()?.items ?? []);

  accounts = this.financeState.accounts;

  showModal = signal(false);
  modalTx = signal<FinanceTransaction | null>(null);
  confirmDeleteId = signal<string | null>(null);

  filterAccount = signal('');
  filterType = signal('');
  filterCategory = signal('');
  searchText = signal('');

  // All filtering is client-side — no HTTP call on filter change
  filteredTransactions = computed(() => {
    let list = this.transactions();
    const type = this.filterType();
    const account = this.filterAccount();
    const category = this.filterCategory();
    const q = this.searchText().toLowerCase().trim();
    if (type) list = list.filter(tx => tx.type === type);
    if (account) list = list.filter(tx => tx.accountId === account || tx.toAccountId === account);
    if (category) list = list.filter(tx => tx.category === category);
    if (q) list = list.filter(tx => tx.description.toLowerCase().includes(q));
    return list;
  });

  readonly categories = CATEGORIES;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly categoryColor = (cat: string) => CATEGORY_COLOR(cat);
  readonly categoryColorActive = (cat: string) => {
    const base = CATEGORY_COLOR(cat);
    return base.replace('100', '500').replace(/text-\w+-\d+/, 'text-white');
  };

  readonly typeOptions = [
    { value: '', label: 'Todos' },
    { value: 'income', label: 'Entrada' },
    { value: 'expense', label: 'Saída' },
    { value: 'transfer', label: 'Transferência' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId'] || changes['month']) {
      this.filterAccount.set('');
      this.filterType.set('');
      this.filterCategory.set('');
      this.searchText.set('');
      this.load();
    }
  }

  openModal(tx: FinanceTransaction | null): void {
    this.modalTx.set(tx);
    this.showModal.set(true);
  }

  onModalClosed(result: FinanceTransaction | false): void {
    const wasEditing = !!this.modalTx();
    this.showModal.set(false);
    this.modalTx.set(null);
    if (!result) return;
    if (wasEditing) {
      this.pagedData.update(d => d ? { ...d, items: d.items.map(t => t.id === result.id ? result : t) } : d);
    } else {
      this.pagedData.update(d => d ? { ...d, items: [result, ...d.items], total: (d.total ?? 0) + 1 } : d);
    }
    this.financeState.markAccountsDirty();
  }

  deleteTransaction(id: string): void {
    this.confirmDeleteId.set(id);
  }

  async doDelete(): Promise<void> {
    const id = this.confirmDeleteId();
    this.confirmDeleteId.set(null);
    if (!id) return;
    this.deletingId.set(id);
    // Optimistic remove
    this.pagedData.update(d => d ? { ...d, items: d.items.filter(t => t.id !== id), total: Math.max(0, (d.total ?? 1) - 1) } : d);
    try {
      await firstValueFrom(this.financeService.deleteTransaction(id));
      this.financeState.markAccountsDirty();
    } catch {
      this.error.set('Erro ao apagar transação. Tenta novamente.');
      await this.load();
    } finally {
      this.deletingId.set(null);
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await firstValueFrom(
        this.financeService.getTransactions(this.householdId, {
          month: this.month,
          pageSize: 100,
        })
      );
      this.pagedData.set(data);
    } catch {
      this.error.set('Erro ao carregar transações. Tenta novamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
