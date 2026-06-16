import { Component, Input, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceStateService } from '../../../../core/services/finance-state.service';
import {
  FinancePlanningItem,
  PlanningItemType,
} from '../../../../core/models/finance-planning.model';
import {
  CATEGORY_LABELS,
  FinanceCategory,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  SupportedCurrency,
} from '../../../../core/models/finance-budget.model';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import { FinanceTransaction } from '../../../../core/models/finance-transaction.model';
import { TransactionFormModalComponent } from '../transaction-form-modal/transaction-form-modal';

const CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];

@Component({
  selector: 'app-planning-tab',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, TransactionFormModalComponent],
  template: `
    <div class="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">

      <!-- Summary card -->
      @if (totalItemCount() > 0) {
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <p class="text-xs font-medium text-emerald-700 uppercase tracking-wide">Estimativa mensal</p>
            <div class="flex rounded-lg border border-emerald-300 overflow-hidden">
              @for (cur of currencies; track cur) {
                <button (click)="displayCurrency.set(cur)"
                  class="px-2.5 py-1 text-xs font-medium transition-colors border-r border-emerald-300 last:border-r-0"
                  [class.bg-emerald-600]="displayCurrency() === cur"
                  [class.text-white]="displayCurrency() === cur"
                  [class.text-emerald-700]="displayCurrency() !== cur">
                  {{ cur }}
                </button>
              }
            </div>
          </div>
          <div class="space-y-1">
            <div>
              <p class="text-2xl font-bold text-emerald-900">
                {{ currencySymbol() }} {{ convertedTotal() | number:'1.2-2' }}
              </p>
              <p class="text-xs text-emerald-600">Total</p>
            </div>
            <div>
              <p class="text-lg font-semibold text-amber-800">
                {{ currencySymbol() }} {{ faltaPagar() | number:'1.2-2' }}
              </p>
              <p class="text-xs text-amber-600">Falta pagar</p>
            </div>
            @if (!financeState.rates()) {
              <p class="text-xs text-emerald-500 mt-0.5">Taxas não disponíveis — valores sem conversão</p>
            }
          </div>
          <p class="text-xs text-emerald-600">
            {{ totalItemCount() }} compromisso{{ totalItemCount() !== 1 ? 's' : '' }} activo{{ totalItemCount() !== 1 ? 's' : '' }}
            @if (excludedCount() > 0) {
              · {{ excludedCount() }} excluído{{ excludedCount() !== 1 ? 's' : '' }} do total
            }
          </p>
        </div>
      }

      <!-- Error banner -->
      @if (error()) {
        <div class="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {{ error() }}
          <button (click)="error.set('')" class="ml-3 text-red-400 hover:text-red-600 shrink-0">✕</button>
        </div>
      }

      <!-- CC invoice items (read-only) -->
      @if (ccAccounts().length > 0) {
        <div class="space-y-2">
          @for (acc of ccAccounts(); track acc.id) {
            <div class="rounded-xl border p-4 transition-opacity"
              [class.bg-blue-50]="!excludedCcIds().has(acc.id)"
              [class.border-blue-200]="!excludedCcIds().has(acc.id)"
              [class.bg-stone-50]="excludedCcIds().has(acc.id)"
              [class.border-stone-200]="excludedCcIds().has(acc.id)"
              [class.opacity-50]="excludedCcIds().has(acc.id)">
              <div class="flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    <p class="text-sm font-medium text-stone-800">{{ acc.name }}</p>
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Fatura aberta</span>
                  </div>
                  <p class="text-sm font-semibold text-stone-700 mt-0.5">
                    {{ acc.currentInvoice ?? 0 | number:'1.2-2' }} {{ acc.currency }}
                  </p>
                </div>
                <button (click)="toggleCcExclusion(acc.id)"
                  class="p-1.5 rounded-lg transition-colors hover:bg-blue-100 shrink-0"
                  [title]="excludedCcIds().has(acc.id) ? 'Incluir no total' : 'Excluir do total'">
                  @if (!excludedCcIds().has(acc.id)) {
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  }
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Divider between CC invoices and planning items -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-stone-200"></div>
          <span class="text-xs text-stone-400 font-medium tracking-wide uppercase">Compromissos</span>
          <div class="flex-1 h-px bg-stone-200"></div>
        </div>
      }

      <!-- Add button -->
      <button (click)="openForm()"
        class="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-dashed border-stone-200 text-stone-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
        + Novo compromisso
      </button>

      <!-- Planning items list -->
      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-16"></div>
          }
        </div>
      } @else if (items().length === 0 && ccAccounts().length === 0) {
        <div class="text-center py-12">
          <p class="text-stone-400 text-sm">Nenhum compromisso registado.</p>
          <p class="text-stone-400 text-xs mt-1">Adiciona as tuas contas fixas e parcelamentos.</p>
        </div>
      } @else if (items().length > 0) {
        <div class="space-y-2">
          @for (item of items(); track item.id) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 transition-opacity"
              [class.opacity-50]="excludedItemIds().has(item.id)"
              [class.border-blue-200]="item.paidViaCC && !manualCcIncludeIds().has(item.id) && !excludedItemIds().has(item.id)"
              [class.bg-blue-50]="item.paidViaCC && !manualCcIncludeIds().has(item.id) && !excludedItemIds().has(item.id)">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-medium text-stone-800">{{ item.description }}</p>
                    @if (item.paidThisMonth) {
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Pago</span>
                    }
                    @if (item.paidViaCC && !item.paidThisMonth) {
                      <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">CC</span>
                    }
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
                  <!-- Registar pagamento (only for unpaid items) -->
                  @if (!item.paidThisMonth) {
                    <button (click)="startPay(item)" title="Registar pagamento"
                      [disabled]="deletingItemId() !== null || saving()"
                      class="p-1.5 rounded-lg text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </button>
                  }
                  <!-- Eye toggle -->
                  @if (item.paidViaCC) {
                    <button (click)="toggleCcPaidInclude(item.id)"
                      class="p-1.5 rounded-lg transition-colors hover:bg-blue-100"
                      [title]="manualCcIncludeIds().has(item.id) ? 'Excluir do total (pago via CC)' : 'Incluir no total'">
                      @if (manualCcIncludeIds().has(item.id)) {
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                      }
                    </button>
                  } @else {
                    <button (click)="toggleItemExclusion(item.id)"
                      class="p-1.5 rounded-lg transition-colors hover:bg-stone-100"
                      [title]="excludedItemIds().has(item.id) ? 'Incluir no total' : 'Excluir do total'">
                      @if (!excludedItemIds().has(item.id)) {
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                      }
                    </button>
                  }
                  <button (click)="startEdit(item)"
                    [disabled]="deletingItemId() !== null || saving()"
                    class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deleteItem(item.id)"
                    [disabled]="deletingItemId() !== null || saving()"
                    class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    @if (deletingItemId() === item.id) {
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
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Planning item form modal -->
    @if (showForm()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
        (click)="closeForm()">
        <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
          (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
            <h2 class="text-base font-semibold text-stone-800">
              {{ editingId() ? 'Editar compromisso' : 'Novo compromisso' }}
            </h2>
            <button type="button" (click)="closeForm()"
              class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4">
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3" id="planning-form">

              <input formControlName="description" placeholder="Descrição (ex: Aluguel, Netflix, Sofá)" type="text"
                class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

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

              <input formControlName="dayOfMonth" placeholder="Dia de vencimento (1-31, opcional)" type="number" min="1" max="31"
                class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

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

            </form>
          </div>

          <div class="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
            <button type="button" (click)="closeForm()"
              class="flex-1 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" form="planning-form" [disabled]="saving() || form.invalid"
              class="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
              {{ saving() ? 'A guardar…' : (editingId() ? 'Guardar alterações' : 'Adicionar') }}
            </button>
          </div>

        </div>
      </div>
    }

    <!-- Pay transaction modal -->
    @if (showPayModal() && payingItem()) {
      <app-transaction-form-modal
        [householdId]="householdId"
        [month]="month"
        [prefillPlanningItem]="{ id: payingItem()!.id, description: payingItem()!.description, amount: payingItem()!.amount, currency: payingItem()!.currency, category: payingItem()!.category }"
        (closed)="onPayModalClosed($event)"
      />
    }
  `,
})
export class PlanningTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  financeState = inject(FinanceStateService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  items = signal<FinancePlanningItem[]>([]);
  ccAccounts = signal<FinanceAccount[]>([]);
  excludedCcIds = signal<Set<string>>(new Set());
  excludedItemIds = signal<Set<string>>(new Set());
  manualCcIncludeIds = signal<Set<string>>(new Set());
  showForm = signal(false);
  editingId = signal<string | null>(null);
  displayCurrency = signal<SupportedCurrency>('BRL');
  showPayModal = signal(false);
  payingItem = signal<FinancePlanningItem | null>(null);
  deletingItemId = signal<string | null>(null);
  error = signal('');

  readonly categories = CATEGORIES;
  readonly currencies = [...SUPPORTED_CURRENCIES] as SupportedCurrency[];
  readonly label = (cat: string) => CATEGORY_LABELS[cat as FinanceCategory] ?? cat;

  currencySymbol = computed(() => CURRENCY_SYMBOLS[this.displayCurrency()]);

  totalItemCount = computed(() => this.items().length + this.ccAccounts().length);

  excludedCount = computed(() => this.excludedCcIds().size + this.excludedItemIds().size);

  convertedTotal = computed(() => {
    const rates = this.financeState.rates()?.rates;
    const target = this.displayCurrency();
    const excludedCc = this.excludedCcIds();
    const excludedItems = this.excludedItemIds();
    const manualInclude = this.manualCcIncludeIds();

    const ccTotal = this.ccAccounts()
      .filter(a => !excludedCc.has(a.id))
      .reduce((sum, a) => {
        const amount = a.currentInvoice ?? 0;
        if (!rates) return sum + (a.currency === target ? amount : 0);
        return sum + amount * (rates[a.currency] ?? 1) / (rates[target] ?? 1);
      }, 0);

    const planningTotal = this.items()
      .filter(item => !excludedItems.has(item.id) && !(item.paidViaCC && !manualInclude.has(item.id)))
      .reduce((sum, item) => {
        const amount = rates
          ? item.amount * (rates[item.currency] ?? 1) / (rates[target] ?? 1)
          : item.currency === target ? item.amount : 0;
        return sum + amount;
      }, 0);

    return ccTotal + planningTotal;
  });

  faltaPagar = computed(() => {
    const rates = this.financeState.rates()?.rates;
    const target = this.displayCurrency();
    const excludedCc = this.excludedCcIds();
    const excludedItems = this.excludedItemIds();
    const manualInclude = this.manualCcIncludeIds();

    const ccFalta = this.ccAccounts()
      .filter(a => !excludedCc.has(a.id))
      .reduce((sum, a) => {
        const amount = a.currentInvoice ?? 0;
        if (!rates) return sum + (a.currency === target ? amount : 0);
        return sum + amount * (rates[a.currency] ?? 1) / (rates[target] ?? 1);
      }, 0);

    const planningFalta = this.items()
      .filter(item =>
        !excludedItems.has(item.id) &&
        !item.paidThisMonth &&
        !(item.paidViaCC && !manualInclude.has(item.id))
      )
      .reduce((sum, item) => {
        const amount = rates
          ? item.amount * (rates[item.currency] ?? 1) / (rates[target] ?? 1)
          : item.currency === target ? item.amount : 0;
        return sum + amount;
      }, 0);

    return ccFalta + planningFalta;
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
    if (changes['householdId']) {
      const storedCc = localStorage.getItem(`hm_cc_excluded_${this.householdId}`);
      this.excludedCcIds.set(new Set(storedCc ? JSON.parse(storedCc) : []));
      const storedItems = localStorage.getItem(`hm_item_excluded_${this.householdId}`);
      this.excludedItemIds.set(new Set(storedItems ? JSON.parse(storedItems) : []));
      const storedCcInclude = localStorage.getItem(`hm_planning_cc_include_${this.householdId}`);
      this.manualCcIncludeIds.set(new Set(storedCcInclude ? JSON.parse(storedCcInclude) : []));
      this.load();
      this.loadCcAccounts();
    } else if (changes['month']) {
      this.loadCcAccounts();
      this.load();
    }
  }

  toggleCcExclusion(accountId: string): void {
    const next = new Set(this.excludedCcIds());
    if (next.has(accountId)) {
      next.delete(accountId);
    } else {
      next.add(accountId);
    }
    this.excludedCcIds.set(next);
    localStorage.setItem(`hm_cc_excluded_${this.householdId}`, JSON.stringify([...next]));
  }

  toggleItemExclusion(itemId: string): void {
    const next = new Set(this.excludedItemIds());
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    this.excludedItemIds.set(next);
    localStorage.setItem(`hm_item_excluded_${this.householdId}`, JSON.stringify([...next]));
  }

  toggleCcPaidInclude(itemId: string): void {
    const next = new Set(this.manualCcIncludeIds());
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    this.manualCcIncludeIds.set(next);
    localStorage.setItem(`hm_planning_cc_include_${this.householdId}`, JSON.stringify([...next]));
  }

  startPay(item: FinancePlanningItem): void {
    this.payingItem.set(item);
    this.showPayModal.set(true);
  }

  onPayModalClosed(result: FinanceTransaction | false): void {
    this.showPayModal.set(false);
    this.payingItem.set(null);
    if (result) {
      this.load();
      this.loadCcAccounts();
    }
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
    this.deletingItemId.set(id);
    try {
      await firstValueFrom(this.financeService.deletePlanningItem(id));
      await this.load();
    } catch {
      this.error.set('Erro ao remover compromisso. Tenta novamente.');
    } finally {
      this.deletingItemId.set(null);
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await firstValueFrom(this.financeService.getPlanningItems(this.householdId, this.month));
      this.items.set(data);
    } catch {
      this.error.set('Erro ao carregar compromissos. Tenta novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCcAccounts(): Promise<void> {
    if (!this.householdId || !this.month) return;
    try {
      const accounts = await firstValueFrom(
        this.financeService.getAccounts(this.householdId, this.month)
      );
      this.ccAccounts.set(accounts.filter(a => a.type === 'cc' && a.isActive));
    } catch {
      // ignore
    }
  }
}
