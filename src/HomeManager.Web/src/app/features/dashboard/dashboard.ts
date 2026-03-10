import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, switchMap, of, map } from 'rxjs';
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
  imports: [AsyncPipe, TimelineWidgetComponent, SummaryWidgetComponent, HouseholdSetupComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  households$!: Observable<Household[]>;
  selectedHousehold$!: Observable<Household | null>;
  items$!: Observable<InventoryItem[]>;
  lowStockCount$!: Observable<number>;
  userName = '';

  readonly patrimonioIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`;
  readonly emFaltaIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`;

  constructor(
    private supabase: SupabaseService,
    private householdService: HouseholdService,
    private inventoryService: InventoryService,
    private pantryService: PantryService
  ) {}

  ngOnInit(): void {
    const user = this.supabase.getCurrentUser();
    this.userName = user?.user_metadata?.['name'] ?? user?.email?.split('@')[0] ?? 'Utilizador';

    this.households$ = this.householdService.getMyHouseholds();
    this.selectedHousehold$ = this.householdService.selectedHousehold$;

    this.items$ = this.householdService.selectedHousehold$.pipe(
      switchMap(h => h ? this.inventoryService.getItems(h.id) : of([]))
    );

    this.lowStockCount$ = this.householdService.selectedHousehold$.pipe(
      switchMap(h => h ? this.pantryService.getItems(h.id, undefined, undefined, 'low') : of([])),
      map(items => items.length)
    );
  }

  getTotalValue(items: InventoryItem[]): string {
    const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(total);
  }
}
