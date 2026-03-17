import { Component, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { StatusDotComponent } from '../../../../shared/components/status-dot/status-dot';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input';
import { FabComponent } from '../../../../shared/components/fab/fab';
import { ItemFormComponent } from '../item-form/item-form';
import { SkeletonBlockComponent } from '../../../../shared/components/skeleton-block/skeleton-block';
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
  location: Location | null;
  items: InventoryItem[];
}

@Component({
  selector: 'app-pertences-tab',
  standalone: true,
  imports: [StatusDotComponent, SearchInputComponent, FabComponent, ItemFormComponent, SkeletonBlockComponent],
  templateUrl: './pertences-tab.html'
})
export class PertencesTabComponent {
  private householdService = inject(HouseholdService);
  private inventoryService = inject(InventoryService);
  private locationService = inject(LocationService);
  private categoryService = inject(CategoryService);

  searchQuery = signal('');
  selectedCategory = signal('Todos');
  collapsedLocations = signal(new Set<string>());
  showNewLocationModal = signal(false);
  showEditLocationModal = signal(false);
  showDeleteLocationModal = signal(false);
  editingLocation = signal<Location | undefined>(undefined);
  locationToDelete = signal<Location | undefined>(undefined);
  activeLocationMenu = signal<string | null>(null);
  submittingLocation = signal(false);
  deletingLocation = signal(false);
  showItemForm = signal(false);
  editingItem = signal<InventoryItem | undefined>(undefined);
  preselectedLocationId = signal<string | undefined>(undefined);
  initialLoading = signal(true);
  reloading = signal(false);

  private selectedHousehold = toSignal(this.householdService.selectedHousehold$);

  householdId = computed(() => this.selectedHousehold()?.id ?? '');

  private reloadTrigger$ = new BehaviorSubject<void>(undefined);

  private dataStream = toSignal(
    combineLatest([
      this.householdService.selectedHousehold$,
      this.reloadTrigger$
    ]).pipe(
      switchMap(([household]) => {
        if (!household) {
          return of({ items: [] as InventoryItem[], locations: [] as Location[], categories: [] as Category[] });
        }
        return combineLatest({
          items: this.inventoryService.getItems(household.id).pipe(catchError(() => of([] as InventoryItem[]))),
          locations: this.locationService.getLocations(household.id).pipe(catchError(() => of([] as Location[]))),
          categories: this.categoryService.getCategories(household.id, 'pertences').pipe(catchError(() => of([] as Category[])))
        });
      }),
      tap(() => {
        this.initialLoading.set(false);
        this.reloading.set(false);
      })
    ),
    { initialValue: { items: [] as InventoryItem[], locations: [] as Location[], categories: [] as Category[] } }
  );

  private allItems = computed(() => this.dataStream().items);
  locations = computed(() => this.dataStream().locations);
  categories = computed(() => this.dataStream().categories);

  allCategories = computed((): string[] => {
    const cats = new Set(this.allItems().map(i => i.category?.name).filter(Boolean) as string[]);
    return ['Todos', ...Array.from(cats).sort()];
  });

  private filteredItems = computed(() => {
    let items = this.allItems();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
    const cat = this.selectedCategory();
    if (cat !== 'Todos') items = items.filter(i => i.category?.name === cat);
    return items;
  });

  locationGroups = computed((): LocationGroup[] => {
    const groups: LocationGroup[] = [];
    for (const loc of this.locations()) {
      const items = this.filteredItems().filter(i => i.locationId === loc.id);
      groups.push({ locationId: loc.id, locationName: loc.name, location: loc, items });
    }
    const noLoc = this.filteredItems().filter(i => !i.locationId);
    if (noLoc.length > 0) {
      groups.push({ locationId: null, locationName: 'Sem Local', location: null, items: noLoc });
    }
    return groups;
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

  formatValue(value: number | undefined): string {
    if (!value) return '';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  }

  isWarning(item: InventoryItem): boolean {
    return item.destination === 'Sell' || item.destination === 'Donate' || item.destination === 'Trash';
  }

  chipClass(cat: string): string {
    const base = 'text-sm font-medium px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0';
    return cat === this.selectedCategory()
      ? `${base} bg-emerald-600 text-white`
      : `${base} bg-stone-100 text-stone-600 hover:bg-stone-200`;
  }

  openNewLocationModal(): void {
    this.showNewLocationModal.set(true);
  }

  closeNewLocationModal(): void {
    this.showNewLocationModal.set(false);
    this.submittingLocation.set(false);
  }

  createLocation(name: string, icon?: string): void {
    if (!name.trim() || !this.householdId() || this.submittingLocation()) return;
    this.submittingLocation.set(true);
    this.locationService.addLocation(name.trim(), this.householdId(), icon?.trim() || undefined).subscribe({
      next: () => {
        this.showNewLocationModal.set(false);
        this.submittingLocation.set(false);
        this.reloadData();
      },
      error: () => this.submittingLocation.set(false)
    });
  }

  toggleLocationMenu(locationId: string | null): void {
    const key = locationId ?? null;
    this.activeLocationMenu.update(current => current === key ? null : key);
  }

  openEditLocationModal(location: Location): void {
    this.editingLocation.set(location);
    this.showEditLocationModal.set(true);
    this.activeLocationMenu.set(null);
  }

  closeEditLocationModal(): void {
    this.showEditLocationModal.set(false);
    this.editingLocation.set(undefined);
    this.submittingLocation.set(false);
  }

  saveEditLocation(name: string, icon?: string): void {
    const loc = this.editingLocation();
    if (!loc || !name.trim() || this.submittingLocation()) return;
    this.submittingLocation.set(true);
    this.locationService.updateLocation(loc.id, name.trim(), icon?.trim() || undefined).subscribe({
      next: () => {
        this.closeEditLocationModal();
        this.submittingLocation.set(false);
        this.reloadData();
      },
      error: () => this.submittingLocation.set(false)
    });
  }

  confirmDeleteLocation(location: Location): void {
    this.activeLocationMenu.set(null);
    this.locationToDelete.set(location);
    this.showDeleteLocationModal.set(true);
  }

  cancelDeleteLocation(): void {
    this.showDeleteLocationModal.set(false);
    this.locationToDelete.set(undefined);
    this.deletingLocation.set(false);
  }

  executeDeleteLocation(): void {
    const loc = this.locationToDelete();
    if (!loc || this.deletingLocation()) return;
    this.deletingLocation.set(true);
    this.locationService.deleteLocation(loc.id).subscribe({
      next: () => {
        this.cancelDeleteLocation();
        this.reloadData();
      },
      error: () => this.deletingLocation.set(false)
    });
  }

  openItemForm(item?: InventoryItem, locationId?: string | null): void {
    this.editingItem.set(item);
    this.preselectedLocationId.set(locationId ?? undefined);
    this.showItemForm.set(true);
  }

  closeItemForm(): void {
    this.showItemForm.set(false);
    this.editingItem.set(undefined);
    this.preselectedLocationId.set(undefined);
  }

  onItemSaved(): void {
    this.closeItemForm();
    this.reloadData();
  }
}
