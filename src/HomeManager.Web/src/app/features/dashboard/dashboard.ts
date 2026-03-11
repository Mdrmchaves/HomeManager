import { Component, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of, map, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseService } from '../../core/services/supabase.service';
import { HouseholdService } from '../../core/services/household.service';
import { InventoryService } from '../../core/services/inventory.service';
import { PantryService } from '../../core/services/pantry.service';
import { Household } from '../../core/models/household.model';
import { InventoryItem } from '../../core/models/inventory-item.model';
import { TimelineWidgetComponent } from './widgets/timeline-widget/timeline-widget';
import { SummaryWidgetComponent } from './widgets/summary-widget/summary-widget';
import { HouseholdSetupComponent } from './household-setup/household-setup';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TimelineWidgetComponent, SummaryWidgetComponent, HouseholdSetupComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  private supabase = inject(SupabaseService);
  private householdService = inject(HouseholdService);
  private inventoryService = inject(InventoryService);
  private pantryService = inject(PantryService);

  private user = this.supabase.getCurrentUser();
  userName = this.user?.user_metadata?.['name'] ?? this.user?.email?.split('@')[0] ?? 'Utilizador';

  readonly patrimonioIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`;
  readonly emFaltaIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`;

  householdsLoading = signal(true);

  households = toSignal(
    this.householdService.getMyHouseholds().pipe(
      catchError(() => of([] as Household[])),
      tap(() => this.householdsLoading.set(false))
    ),
    { initialValue: [] as Household[] }
  );

  selectedHousehold = toSignal(this.householdService.selectedHousehold$);

  dataLoading = signal(false);

  private itemsStream = toSignal(
    this.householdService.selectedHousehold$.pipe(
      tap(h => { if (h) this.dataLoading.set(true); }),
      switchMap(h => h
        ? this.inventoryService.getItems(h.id).pipe(catchError(() => of([])))
        : of([])
      ),
      tap(() => this.dataLoading.set(false))
    ),
    { initialValue: [] as InventoryItem[] }
  );

  private lowStockStream = toSignal(
    this.householdService.selectedHousehold$.pipe(
      switchMap(h => h
        ? this.pantryService.getItems(h.id, undefined, undefined, 'low').pipe(
            catchError(() => of([]))
          )
        : of([])
      ),
      map(items => items.length)
    ),
    { initialValue: 0 }
  );

  hasHouseholds = computed(() => (this.households()?.length ?? 0) > 0);
  totalValue = computed(() => this.getTotalValue(this.itemsStream()));
  lowStockCount = computed(() => this.lowStockStream());

  private getTotalValue(items: InventoryItem[]): string {
    const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(total);
  }
}
