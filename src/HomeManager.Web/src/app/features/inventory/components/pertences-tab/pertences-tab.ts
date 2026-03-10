import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, combineLatest, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { StatusDotComponent } from '../../../../shared/components/status-dot/status-dot';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input';
import { FabComponent } from '../../../../shared/components/fab/fab';
import { ItemFormComponent } from '../item-form/item-form';
import { HouseholdService } from '../../../../core/services/household.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { LocationService } from '../../../../core/services/location.service';
import { CategoryService } from '../../../../core/services/category.service';
import { Location } from '../../../../core/models/location.model';
import { Category } from '../../../../core/models/category.model';
import { InventoryItem } from '../../../../core/models/inventory-item.model';

interface LocationGroup {
  locationId: string | null;
  locationName: string;
  items: InventoryItem[];
}

@Component({
  selector: 'app-pertences-tab',
  standalone: true,
  imports: [StatusDotComponent, SearchInputComponent, FabComponent, ItemFormComponent],
  templateUrl: './pertences-tab.html'
})
export class PertencesTabComponent implements OnInit, OnDestroy {
  allItems: InventoryItem[] = [];
  locations: Location[] = [];
  categories: Category[] = [];
  searchQuery = '';
  selectedCategory = 'Todos';
  collapsedLocations = new Set<string>();
  showNewLocationModal = false;
  showItemForm = false;
  editingItem: InventoryItem | undefined = undefined;
  preselectedLocationId: string | undefined = undefined;
  loading = false;

  householdId = '';

  private destroy$ = new Subject<void>();

  constructor(
    private householdService: HouseholdService,
    private inventoryService: InventoryService,
    private locationService: LocationService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.householdService.selectedHousehold$.pipe(
      takeUntil(this.destroy$),
      switchMap(household => {
        if (!household) {
          return of({
            items: [] as InventoryItem[],
            locations: [] as Location[],
            categories: [] as Category[]
          });
        }
        this.householdId = household.id;
        this.loading = true;
        return combineLatest({
          items: this.inventoryService.getItems(household.id),
          locations: this.locationService.getLocations(household.id),
          categories: this.categoryService.getCategories(household.id, 'pertences')
        });
      })
    ).subscribe({
      next: ({ items, locations, categories }) => {
        this.allItems = items;
        this.locations = locations;
        this.categories = categories;
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
    const cats = new Set(this.allItems.map(i => i.category?.name).filter(Boolean) as string[]);
    return ['Todos', ...Array.from(cats).sort()];
  }

  private get filteredItems(): InventoryItem[] {
    let items = this.allItems;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    if (this.selectedCategory !== 'Todos') {
      items = items.filter(i => i.category?.name === this.selectedCategory);
    }
    return items;
  }

  get locationGroups(): LocationGroup[] {
    const groups: LocationGroup[] = [];
    for (const loc of this.locations) {
      const items = this.filteredItems.filter(i => i.locationId === loc.id);
      groups.push({ locationId: loc.id, locationName: loc.name, items });
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

  formatValue(value: number | undefined): string {
    if (!value) return '';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  }

  isWarning(item: InventoryItem): boolean {
    return item.destination === 'Sell' || item.destination === 'Donate' || item.destination === 'Trash';
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

  createLocation(name: string, icon?: string): void {
    if (!name.trim() || !this.householdId) return;
    this.locationService.addLocation(name.trim(), this.householdId, icon?.trim() || undefined).subscribe(loc => {
      this.locations = [...this.locations, loc];
      this.showNewLocationModal = false;
    });
  }

  openItemForm(item?: InventoryItem, locationId?: string | null): void {
    this.editingItem = item;
    this.preselectedLocationId = locationId ?? undefined;
    this.showItemForm = true;
  }

  closeItemForm(): void {
    this.showItemForm = false;
    this.editingItem = undefined;
    this.preselectedLocationId = undefined;
  }

  onItemSaved(): void {
    this.closeItemForm();
    this.reloadData();
  }

  private reloadData(): void {
    if (!this.householdId) return;
    this.loading = true;
    combineLatest({
      items: this.inventoryService.getItems(this.householdId),
      locations: this.locationService.getLocations(this.householdId),
      categories: this.categoryService.getCategories(this.householdId, 'pertences')
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ items, locations, categories }) => {
        this.allItems = items;
        this.locations = locations;
        this.categories = categories;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
