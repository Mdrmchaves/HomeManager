import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';
import { FinanceAccount } from '../../../../core/models/finance-account.model';
import { SUPPORTED_CURRENCIES } from '../../../../core/models/finance-budget.model';

@Component({
  selector: 'app-accounts-tab',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  template: `
    <div class="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      <!-- Add form -->
      <div class="bg-white rounded-xl border border-stone-200 p-5">
        <h3 class="text-sm font-semibold text-stone-700 mb-4">Nova Conta</h3>

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

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <input formControlName="name" placeholder="Nome da conta" type="text"
              class="col-span-2 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
            <select formControlName="currency"
              class="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
              @for (cur of currencies; track cur) {
                <option [value]="cur">{{ cur }}</option>
              }
            </select>
          </div>

          @if (accountType() === 'cc') {
            <div class="grid grid-cols-3 gap-3">
              <input formControlName="closeDay" placeholder="Fecho (dia)" type="number" min="1" max="31"
                class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              <input formControlName="dueDay" placeholder="Vencimento (dia)" type="number" min="1" max="31"
                class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              <input formControlName="limit" placeholder="Limite (opcional)" type="number" step="0.01" min="0"
                class="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          }

          <button type="submit" [disabled]="saving() || form.invalid"
            class="w-full py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
            {{ saving() ? 'A guardar…' : 'Criar Conta' }}
          </button>
        </form>
      </div>

      <!-- Account list -->
      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 animate-pulse h-16"></div>
          }
        </div>
      } @else {
        <div class="space-y-2">
          @for (acc of accounts(); track acc.id) {
            <div class="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-stone-800">{{ acc.name }}</p>
                  <span class="px-1.5 py-0.5 rounded text-xs font-medium"
                    [class.bg-blue-100]="acc.type === 'cc'"
                    [class.text-blue-700]="acc.type === 'cc'"
                    [class.bg-stone-100]="acc.type === 'account'"
                    [class.text-stone-600]="acc.type === 'account'">
                    {{ acc.type === 'cc' ? 'Crédito' : 'Conta' }}
                  </span>
                </div>
                <p class="text-xs text-stone-400 mt-0.5">
                  {{ acc.currency }}
                  @if (acc.type === 'cc' && acc.closeDay) {
                    · Fecho dia {{ acc.closeDay }}
                  }
                  @if (acc.limit) {
                    · Limite {{ acc.limit | number:'1.2-2' }}
                  }
                </p>
              </div>
              <button (click)="deleteAccount(acc.id)"
                class="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          }
          @if (accounts().length === 0) {
            <p class="text-center text-stone-400 text-sm py-8">Nenhuma conta criada.</p>
          }
        </div>
      }
    </div>
  `,
})
export class AccountsTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;
  @Input({ required: true }) month!: string;

  private financeService = inject(FinanceService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  accounts = signal<FinanceAccount[]>([]);
  accountType = signal<'account' | 'cc'>('account');

  readonly currencies = SUPPORTED_CURRENCIES;

  form = this.fb.group({
    name: ['', Validators.required],
    currency: ['BRL', Validators.required],
    closeDay: [null as number | null],
    dueDay: [null as number | null],
    limit: [null as number | null],
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
      await firstValueFrom(this.financeService.createAccount({
        householdId: this.householdId,
        name: v.name!,
        currency: v.currency!,
        type: this.accountType(),
        closeDay: this.accountType() === 'cc' ? v.closeDay ?? undefined : undefined,
        dueDay: this.accountType() === 'cc' ? v.dueDay ?? undefined : undefined,
        limit: this.accountType() === 'cc' ? v.limit ?? undefined : undefined,
      }));
      this.form.patchValue({ name: '', closeDay: null, dueDay: null, limit: null });
      await this.load();
    } catch {
      // ignore
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAccount(id: string): Promise<void> {
    if (!confirm('Apagar esta conta? As transações associadas ficarão sem conta.')) return;
    try {
      await firstValueFrom(this.financeService.deleteAccount(id));
      await this.load();
    } catch {
      // ignore
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.financeService.getAccounts(this.householdId));
      this.accounts.set(data);
    } catch {
      // ignore
    } finally {
      this.loading.set(false);
    }
  }
}
