import { Component, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, combineLatest, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, take } from 'rxjs/operators';
import { StatusDotComponent } from '../../../../shared/components/status-dot/status-dot';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input';
import { FabComponent } from '../../../../shared/components/fab/fab';
import { HouseholdService } from '../../../../core/services/household.service';
import { PantryService } from '../../../../core/services/pantry.service';
import { LocationService } from '../../../../core/services/location.service';
import { Location } from '../../../../core/models/location.model';
import { PantryItem } from '../../../../core/models/pantry-item.model';

interface LocationGroup {
  locationId: string | null;
  locationName: string;
  items: PantryItem[];
}

@Component({
  selector: 'app-despensa-tab',
  standalone: true,
  imports: [StatusDotComponent, SearchInputComponent, FabComponent],
  templateUrl: './despensa-tab.html'
})
export class DespensaTabComponent {
  private householdService = inject(HouseholdService);
  private pantryService = inject(PantryService);
  private locationService = inject(LocationService);

  searchQuery = signal('');
  selectedCategory = signal('Todos');
  collapsedLocations = signal(new Set<string>());
  showNewLocationModal = signal(false);
  initialLoading = signal(true);
  reloading = signal(false);

  private reloadTrigger$ = new BehaviorSubject<void>(undefined);

  private dataStream = toSignal(
    combineLatest([
      this.householdService.selectedHousehold$,
      this.reloadTrigger$
    ]).pipe(
      switchMap(([household]) => {
        if (!household) {
          return of({ items: [] as PantryItem[], locations: [] as Location[] });
        }
        return combineLatest({
          items: this.pantryService.getItems(household.id).pipe(
            catchError(() => of([] as PantryItem[]))
          ),
          locations: this.locationService.getLocations(household.id).pipe(
            catchError(() => of([] as Location[]))
          )
        });
      }),
      tap(() => {
        this.initialLoading.set(false);
        this.reloading.set(false);
      })
    ),
    { initialValue: { items: [] as PantryItem[], locations: [] as Location[] } }
  );

  private allItems = computed(() => this.dataStream().items);
  locations = computed(() => this.dataStream().locations);

  private selectedHousehold = toSignal(this.householdService.selectedHousehold$);
  householdId = computed(() => this.selectedHousehold()?.id ?? '');

  private filteredItems = computed(() => {
    let items = this.allItems();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
    const cat = this.selectedCategory();
    if (cat !== 'Todos') items = items.filter(i => i.categoryName === cat);
    return items;
  });

  locationGroups = computed((): LocationGroup[] => {
    const groups: LocationGroup[] = [];
    for (const loc of this.locations()) {
      const items = this.filteredItems().filter(i => i.locationId === loc.id);
      groups.push({ locationId: loc.id, locationName: loc.name, items });
    }
    const noLoc = this.filteredItems().filter(i => !i.locationId);
    if (noLoc.length > 0) {
      groups.push({ locationId: null, locationName: 'Sem Local', items: noLoc });
    }
    return groups;
  });

  allCategories = computed((): string[] => {
    const cats = new Set(this.allItems().map(i => i.categoryName).filter(Boolean) as string[]);
    return ['Todos', ...Array.from(cats).sort()];
  });

  reloadData(): void {
    this.reloading.set(true);
    this.reloadTrigger$.next();
  }

  toggleLocation(locationId: string | null): void {
    const key = locationId ?? '__sem_local__';
    this.collapsedLocations.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  isCollapsed(locationId: string | null): boolean {
    return this.collapsedLocations().has(locationId ?? '__sem_local__');
  }

  isLow(item: PantryItem): boolean {
    return item.status === 'low';
  }

  chipClass(cat: string): string {
    const base = 'text-sm font-medium px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0';
    return cat === this.selectedCategory()
      ? `${base} bg-emerald-600 text-white`
      : `${base} bg-stone-100 text-stone-600 hover:bg-stone-200`;
  }

  createLocation(name: string): void {
    const hid = this.householdId();
    if (!name.trim() || !hid) return;
    this.locationService.addLocation(name.trim(), hid).pipe(take(1)).subscribe(() => {
      this.showNewLocationModal.set(false);
      this.reloadData();
    });
  }
}
