import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import { SUPPORTED_CURRENCIES } from '../../../../core/models/finance-budget.model';

@Component({
  selector: 'app-account-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      (click)="cancel()">
      <!-- Modal -->
      <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 class="text-base font-semibold text-stone-800">
            {{ account ? 'Editar Conta' : 'Nova Conta' }}
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
          <!-- Type toggle -->
          <div class="flex gap-2 mb-4">
            <button type="button"
              (click)="accountType.set('account')"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-emerald-600]="accountType() === 'account'"
              [class.text-white]="accountType() === 'account'"
              [class.border-emerald-600]="accountType() === 'account'"
              [class.border-stone-200]="accountType() !== 'account'"
              [class.text-stone-600]="accountType() !== 'account'">
              Conta
            </button>
            <button type="button"
              (click)="accountType.set('cc')"
              class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              [class.bg-emerald-600]="accountType() === 'cc'"
              [class.text-white]="accountType() === 'cc'"
              [class.border-emerald-600]="accountType() === 'cc'"
              [class.border-stone-200]="accountType() !== 'cc'"
              [class.text-stone-600]="accountType() !== 'cc'">
              Cartão de Crédito
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3" id="account-form">
            <input formControlName="name" placeholder="Nome da conta *" type="text"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              [class.border-red-400]="form.controls['name'].invalid && form.controls['name'].touched" />

            <select formControlName="currency"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
              @for (cur of currencies; track cur) {
                <option [value]="cur">{{ cur }}</option>
              }
            </select>

            @if (accountType() === 'cc') {
              <div class="grid grid-cols-3 gap-3">
                <input formControlName="closeDay" placeholder="Fecho (dia)" type="number" min="1" max="31"
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                <input formControlName="dueDay" placeholder="Vencimento (dia)" type="number" min="1" max="31"
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                <input formControlName="limit" placeholder="Limite" type="number" step="0.01" min="0"
                  class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            }

            <input formControlName="balance" placeholder="Saldo actual" type="number" step="0.01"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />

            @if (error()) {
              <p class="text-xs text-red-500">{{ error() }}</p>
            }
          </form>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 px-5 py-4 border-t border-stone-100">
          <button type="button" (click)="cancel()"
            class="flex-1 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="account-form" [disabled]="saving() || form.invalid"
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
            {{ saving() ? 'A guardar…' : (account ? 'Actualizar' : 'Criar Conta') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AccountFormModalComponent implements OnInit {
  @Input({ required: true }) householdId!: string;
  @Input() account: FinanceAccount | null = null;
  @Output() closed = new EventEmitter<boolean>();

  private financeService = inject(FinanceService);
  private fb = inject(FormBuilder);

  saving = signal(false);
  error = signal('');
  accountType = signal<'account' | 'cc'>('account');

  readonly currencies = SUPPORTED_CURRENCIES;

  form = this.fb.group({
    name: ['', Validators.required],
    currency: ['BRL', Validators.required],
    closeDay: [null as number | null],
    dueDay: [null as number | null],
    limit: [null as number | null],
    balance: [null as number | null],
  });

  ngOnInit(): void {
    if (this.account) {
      this.accountType.set(this.account.type);
      this.form.patchValue({
        name: this.account.name,
        currency: this.account.currency,
        closeDay: this.account.closeDay ?? null,
        dueDay: this.account.dueDay ?? null,
        limit: this.account.limit ?? null,
        balance: this.account.balance,
      });
    }
  }

  cancel(): void {
    this.closed.emit(false);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      const isCC = this.accountType() === 'cc';

      if (this.account) {
        await firstValueFrom(this.financeService.updateAccount(this.account.id, {
          name: v.name ?? undefined,
          currency: v.currency ?? undefined,
          type: this.accountType(),
          closeDay: isCC ? (v.closeDay ?? undefined) : undefined,
          dueDay: isCC ? (v.dueDay ?? undefined) : undefined,
          limit: isCC ? (v.limit ?? undefined) : undefined,
          balance: v.balance ?? undefined,
        }));
      } else {
        await firstValueFrom(this.financeService.createAccount({
          householdId: this.householdId,
          name: v.name!,
          currency: v.currency!,
          type: this.accountType(),
          closeDay: isCC ? (v.closeDay ?? undefined) : undefined,
          dueDay: isCC ? (v.dueDay ?? undefined) : undefined,
          limit: isCC ? (v.limit ?? undefined) : undefined,
          balance: v.balance ?? undefined,
        }));
      }
      this.closed.emit(true);
    } catch {
      this.error.set('Ocorreu um erro ao guardar. Tenta novamente.');
    } finally {
      this.saving.set(false);
    }
  }
}
