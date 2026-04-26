import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceService } from '../../../../core/services/finance.service';

@Component({
  selector: 'app-exchange-tab',
  standalone: true,
  imports: [],
  template: `
    <div class="p-4 md:p-8 max-w-xl mx-auto">
      @if (loading()) {
        <div class="bg-white rounded-xl border border-stone-200 p-5 animate-pulse h-48"></div>
      } @else {
        <div class="bg-white rounded-xl border border-stone-200 p-5 space-y-5">
          <h3 class="text-sm font-semibold text-stone-700">Taxas de Câmbio</h3>
          <p class="text-xs text-stone-500">Todas as taxas expressas em BRL (1 unidade da moeda = X reais).</p>

          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-sm text-stone-700 w-28">1 Euro (€)</span>
              <span class="text-stone-400 text-sm">=</span>
              <input type="number" step="0.01" min="0"
                [value]="getRate('EUR', 6)"
                (input)="setRate('EUR', +$any($event.target).value)"
                class="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              <span class="text-sm text-stone-500">BRL</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-stone-700 w-28">1 Dólar ($)</span>
              <span class="text-stone-400 text-sm">=</span>
              <input type="number" step="0.01" min="0"
                [value]="getRate('USD', 5.5)"
                (input)="setRate('USD', +$any($event.target).value)"
                class="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              <span class="text-sm text-stone-500">BRL</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-stone-700 w-28">1000 Guarani (₲)</span>
              <span class="text-stone-400 text-sm">=</span>
              <input type="number" step="0.0001" min="0"
                [value]="getRate('PYG', 0.0007) * 1000"
                (input)="setRate('PYG', +$any($event.target).value / 1000)"
                class="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              <span class="text-sm text-stone-500">BRL</span>
            </div>
          </div>

          <button (click)="save()" [disabled]="saving()"
            class="w-full py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
            {{ saving() ? 'A guardar…' : 'Guardar Taxas' }}
          </button>
          @if (saveMsg()) {
            <p class="text-sm text-center text-stone-600">{{ saveMsg() }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class ExchangeTabComponent implements OnChanges {
  @Input({ required: true }) householdId!: string;

  private financeService = inject(FinanceService);

  loading = signal(false);
  saving = signal(false);
  saveMsg = signal('');
  rates = signal<Record<string, number>>({ BRL: 1, EUR: 6.0, USD: 5.5, PYG: 0.0007 });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['householdId']) this.load();
  }

  getRate(currency: string, fallback: number): number {
    return this.rates()[currency] || fallback;
  }

  setRate(currency: string, value: number): void {
    this.rates.update(r => ({ ...r, [currency]: value }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saveMsg.set('');
    try {
      const allRates = { ...this.rates(), BRL: 1 };
      await firstValueFrom(this.financeService.upsertRates({
        householdId: this.householdId,
        rates: allRates,
      }));
      this.saveMsg.set('Taxas guardadas.');
    } catch {
      this.saveMsg.set('Erro ao guardar.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    if (!this.householdId) return;
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.financeService.getRates(this.householdId));
      this.rates.set(data.rates);
    } catch {
      // ignore — defaults already set
    } finally {
      this.loading.set(false);
    }
  }
}
