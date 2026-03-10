import { Component } from '@angular/core';
import { StatusDotComponent } from '../../../../shared/components/status-dot/status-dot';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input';
import { FabComponent } from '../../../../shared/components/fab/fab';
import { LocationService } from '../../../../core/services/location.service';
import { Location } from '../../../../core/models/location.model';
import { MOCK_PERTENCES_ITEMS, MockPertencesItem } from '../../../../core/mock/inventory.mock';

interface LocationGroup {
  locationId: string | null;
  locationName: string;
  items: MockPertencesItem[];
}

@Component({
  selector: 'app-pertences-tab',
  standalone: true,
  imports: [StatusDotComponent, SearchInputComponent, FabComponent],
  templateUrl: './pertences-tab.html'
})
export class PertencesTabComponent {
  allItems = MOCK_PERTENCES_ITEMS;
  locations: Location[] = [];
  searchQuery = '';
  selectedCategory = 'Todos';
  collapsedLocations = new Set<string>();
  showNewLocationModal = false;

  constructor(private locationService: LocationService) {
    this.locations = locationService.getLocations();
  }

  get allCategories(): string[] {
    const cats = new Set(this.allItems.map(i => i.category));
    return ['Todos', ...Array.from(cats).sort()];
  }

  private get filteredItems(): MockPertencesItem[] {
    let items = this.allItems;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    if (this.selectedCategory !== 'Todos') {
      items = items.filter(i => i.category === this.selectedCategory);
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

  formatValue(value: number | undefined): string {
    if (!value) return '';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  }

  isWarning(item: MockPertencesItem): boolean {
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

  createLocation(name: string): void {
    if (!name.trim()) return;
    this.locationService.addLocation(name, 'mock-household');
    this.locations = this.locationService.getLocations();
    this.showNewLocationModal = false;
  }
}
