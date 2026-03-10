import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, combineLatest, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
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
export class DespensaTabComponent implements OnInit, OnDestroy {
  allItems: PantryItem[] = [];
  locations: Location[] = [];
  searchQuery = '';
  selectedCategory = 'Todos';
  collapsedLocations = new Set<string>();
  showNewLocationModal = false;
  loading = false;

  private householdId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private householdService: HouseholdService,
    private pantryService: PantryService,
    private locationService: LocationService
  ) {}

  ngOnInit(): void {
    this.householdService.selectedHousehold$.pipe(
      takeUntil(this.destroy$),
      switchMap(household => {
        if (!household) return of({ items: [] as PantryItem[], locations: [] as Location[] });
        this.householdId = household.id;
        this.loading = true;
        return combineLatest({
          items: this.pantryService.getItems(household.id),
          locations: this.locationService.getLocations(household.id)
        });
      })
    ).subscribe({
      next: ({ items, locations }) => {
        this.allItems = items;
        this.locations = locations;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get allCategories(): string[] {
    const cats = new Set(this.allItems.map(i => i.categoryName).filter(Boolean) as string[]);
    return ['Todos', ...Array.from(cats).sort()];
  }

  private get filteredItems(): PantryItem[] {
    let items = this.allItems;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    if (this.selectedCategory !== 'Todos') {
      items = items.filter(i => i.categoryName === this.selectedCategory);
    }
    return items;
  }

  get locationGroups(): LocationGroup[] {
    const groups: LocationGroup[] = [];
    for (const loc of this.locations) {
      const items = this.filteredItems.filter(i => i.locationId === loc.id);
      if (items.length > 0) {
        groups.push({ locationId: loc.id, locationName: loc.name, items });
      }
    }
    const noLoc = this.filteredItems.filter(i => !i.locationId);
    if (noLoc.length > 0) {
      groups.push({ locationId: null, locationName: 'Sem Local', items: noLoc });
    }
    return groups;
  }

  toggleLocation(locationId: string | null): void {
    const key = locationId ?? '__sem_local__';
    if (this.collapsedLocations.has(key)) {
      this.collapsedLocations.delete(key);
    } else {
      this.collapsedLocations.add(key);
    }
  }

  isCollapsed(locationId: string | null): boolean {
    return this.collapsedLocations.has(locationId ?? '__sem_local__');
  }

  isLow(item: PantryItem): boolean {
    return item.status === 'low';
  }

  chipClass(cat: string): string {
    const base = 'text-sm font-medium px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0';
    return cat === this.selectedCategory
      ? `${base} bg-emerald-600 text-white`
      : `${base} bg-stone-100 text-stone-600 hover:bg-stone-200`;
  }

  openNewLocationModal(): void {
    this.showNewLocationModal = true;
  }

  closeNewLocationModal(): void {
    this.showNewLocationModal = false;
  }

  createLocation(name: string): void {
    if (!name.trim() || !this.householdId) return;
    this.locationService.addLocation(name.trim(), this.householdId).subscribe(loc => {
      this.locations = [...this.locations, loc];
      this.showNewLocationModal = false;
    });
  }
}
