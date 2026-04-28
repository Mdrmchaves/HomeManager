import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceStateService } from '../../../../core/services/finance-state.service';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import { AccountFormModalComponent } from '../account-form-modal/account-form-modal';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => Promise<void>;
}

@Component({
  selector: 'app-accounts-tab',
  standalone: true,
  imports: [DecimalPipe, AccountFormModalComponent, ConfirmModalComponent],
  template: `
    <div class="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-stone-800">Contas e Cartões</h2>
          <p class="text-xs text-stone-400 mt-0.5">{{ activeCount() }} activa{{ activeCount() !== 1 ? 's' : '' }}
            @if (inactiveCount() > 0) { · {{ inactiveCount() }} inactiva{{ inactiveCount() !== 1 ? 's' : '' }} }
          </p>
        </div>
        <button type="button" (click)="openModal(null)"
          class="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
          + Nova Conta
        </button>
      </div>

      <!-- Grid of account cards -->
      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="bg-white rounded-2xl border border-stone-200 p-5 animate-pulse h-44"></div>
          }
        </div>
      } @else if (accounts().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
            </svg>
          </div>
          <p class="text-sm font-medium text-stone-600">Nenhuma conta criada</p>
          <p class="text-xs text-stone-400 mt-1">Adiciona uma conta ou cartão de crédito para começar.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (acc of accounts(); track acc.id) {
            <div class="bg-white rounded-2xl border flex flex-col transition-all duration-200"
              [class.border-stone-200]="acc.isActive"
              [class.border-stone-100]="!acc.isActive"
              [class.opacity-55]="!acc.isActive">

              <!-- Card header -->
              <div class="px-5 pt-5 pb-3 flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <!-- Type icon -->
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    [class.bg-blue-50]="acc.type === 'cc'"
                    [class.bg-emerald-50]="acc.type === 'account'">
                    @if (acc.type === 'cc') {
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/>
                      </svg>
                    }
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-stone-800 leading-tight">{{ acc.name }}</p>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="text-xs font-medium"
                        [class.text-blue-500]="acc.type === 'cc'"
                        [class.text-emerald-600]="acc.type === 'account'">
                        {{ acc.type === 'cc' ? 'Crédito' : 'Conta' }}
                      </span>
                      <span class="text-stone-300">·</span>
                      <span class="text-xs text-stone-400">{{ acc.currency }}</span>
                      @if (!acc.isActive) {
                        <span class="text-stone-300">·</span>
                        <span class="text-xs text-stone-400 font-medium">Inactiva</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card body -->
              <div class="px-5 pb-4 flex-1">
                @if (acc.type === 'cc') {
                  <!-- CC: fatura + progress + limite -->
                  <div class="space-y-3">
                    <div>
                      <p class="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">Fatura {{ monthLabel() }}</p>
                      <p class="text-2xl font-bold text-stone-800">
                        {{ (acc.currentInvoice ?? 0) | number:'1.2-2' }}
                        <span class="text-sm font-normal text-stone-400 ml-1">{{ acc.currency }}</span>
                      </p>
                    </div>

                    @if (acc.limit) {
                      <!-- Usage bar -->
                      <div>
                        <div class="flex justify-between text-xs text-stone-400 mb-1">
                          <span>{{ usedPct(acc) }}% do limite</span>
                          <span>{{ acc.limit | number:'1.2-2' }} {{ acc.currency }}</span>
                        </div>
                        <div class="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                            [style.width.%]="usedPct(acc)"
                            [class.bg-emerald-500]="usedPct(acc) < 70"
                            [class.bg-amber-400]="usedPct(acc) >= 70 && usedPct(acc) < 90"
                            [class.bg-red-500]="usedPct(acc) >= 90">
                          </div>
                        </div>
                      </div>
                    }

                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      @if (acc.closeDay) {
                        <span>Fecho dia <strong class="text-stone-700">{{ acc.closeDay }}</strong>{{ acc.closeMonthIsNext ? ' (mês seg.)' : '' }}</span>
                      }
                      @if (acc.dueDay) { <span>Venc. dia <strong class="text-stone-700">{{ acc.dueDay }}</strong></span> }
                      <span>Total: <strong class="text-stone-700">{{ acc.balance | number:'1.2-2' }} {{ acc.currency }}</strong></span>
                    </div>
                  </div>
                } @else {
                  <!-- Regular account: balance prominently -->
                  <div>
                    <p class="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">Saldo actual</p>
                    <p class="text-2xl font-bold"
                      [class.text-stone-800]="acc.balance >= 0"
                      [class.text-red-600]="acc.balance < 0">
                      {{ acc.balance | number:'1.2-2' }}
                      <span class="text-sm font-normal text-stone-400 ml-1">{{ acc.currency }}</span>
                    </p>
                  </div>
                }
              </div>

              <!-- Card footer — actions -->
              <div class="border-t border-stone-100 px-4 py-2.5 flex items-center justify-end gap-1">
                <!-- Recalculate -->
                <button (click)="recalculate(acc)"
                  class="p-1.5 rounded-lg text-stone-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Recalcular saldo a partir das transações">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
                <!-- Edit -->
                <button (click)="openModal(acc)"
                  class="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                  title="Editar">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <!-- Deactivate / Reactivate -->
                @if (acc.isActive) {
                  <button (click)="askToggleActive(acc, false)"
                    class="p-1.5 rounded-lg text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                    title="Desactivar conta">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  </button>
                } @else {
                  <button (click)="askToggleActive(acc, true)"
                    class="p-1.5 rounded-lg text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    title="Reactivar conta">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                }
                <!-- Delete -->
                <button (click)="askDelete(acc.id)"
                  class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Apagar">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Account form modal -->
    @if (showModal()) {
      <app-account-form-modal
        [householdId]="householdId"
        [account]="modalAccount()"
        (closed)="onModalClosed($event)"
      />
    }

    <!-- Confirm modal -->
    @if (confirmState()) {
      <app-confirm-modal
        [title]="confirmState()!.title"
        [message]="confirmState()!.message"
        [confirmLabel]="confirmState()!.confirmLabel"
        [destructive]="confirmState()!.destructive"
        (confirmed)="onConfirmed()"
        (cancelled)="confirmState.set(null)"
      />
    }
  `,
})
export class AccountsTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  private financeState = inject(FinanceStateService);

  loading = signal(false);
  accounts = signal<FinanceAccount[]>([]);
  showModal = signal(false);
  modalAccount = signal<FinanceAccount | null>(null);
  confirmState = signal<ConfirmState | null>(null);

  activeCount = () => this.accounts().filter(a => a.isActive).length;
  inactiveCount = () => this.accounts().filter(a => !a.isActive).length;

  monthLabel(): string {
    if (!this.month) return '';
    const [year, month] = this.month.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }

  usedPct(acc: FinanceAccount): number {
    if (!acc.limit || acc.limit === 0) return 0;
    return Math.min(100, Math.round(((acc.currentInvoice ?? 0) / acc.limit) * 100));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId'] || changes['month']) {
      this.load();
      this.financeState.refreshIfDirty(); // sync shared cache if transactions were mutated
    }
  }

  openModal(acc: FinanceAccount | null): void {
    this.modalAccount.set(acc);
    this.showModal.set(true);
  }

  async onModalClosed(saved: boolean): Promise<void> {
    this.showModal.set(false);
    this.modalAccount.set(null);
    if (saved) {
      await Promise.all([this.load(), this.financeState.refreshAccounts()]);
    }
  }

  async onConfirmed(): Promise<void> {
    const state = this.confirmState();
    this.confirmState.set(null);
    if (state) await state.onConfirm();
  }

  askToggleActive(acc: FinanceAccount, isActive: boolean): void {
    this.confirmState.set({
      title: isActive ? 'Reactivar conta' : 'Desactivar conta',
      message: isActive
        ? `Reactivar "${acc.name}"? Voltará a aparecer nos formulários de transações.`
        : `Desactivar "${acc.name}"? Ficará oculta nos formulários de transações mas não será apagada.`,
      confirmLabel: isActive ? 'Reactivar' : 'Desactivar',
      destructive: !isActive,
      onConfirm: async () => {
        await firstValueFrom(this.financeService.updateAccount(acc.id, { isActive }));
        await Promise.all([this.load(), this.financeState.refreshAccounts()]);
      },
    });
  }

  askDelete(id: string): void {
    const acc = this.accounts().find(a => a.id === id);
    this.confirmState.set({
      title: 'Apagar conta',
      message: `Apagar "${acc?.name ?? 'esta conta'}"? As transações associadas ficarão sem conta. Esta acção é irreversível.`,
      confirmLabel: 'Apagar',
      destructive: true,
      onConfirm: async () => {
        await firstValueFrom(this.financeService.deleteAccount(id));
        await Promise.all([this.load(), this.financeState.refreshAccounts()]);
      },
    });
  }

  async recalculate(acc: FinanceAccount): Promise<void> {
    try {
      const updated = await firstValueFrom(this.financeService.recalculateAccount(acc.id));
      this.accounts.update(list => list.map(a => a.id === acc.id ? { ...a, balance: updated.balance } : a));
    } catch {
      // ignore
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(
        this.financeService.getAccounts(this.householdId, this.month, true)
      );
      this.accounts.set(data);
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
    }
  }
}
