import { Component, OnInit } from '@angular/core';
import { HouseholdService } from '../../../../core/services/household.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { InventoryItem } from '../../../../core/models/inventory-item.model';
import { StatusDotComponent } from '../../../../shared/components/status-dot/status-dot';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input';
import { FabComponent } from '../../../../shared/components/fab/fab';
import { MOCK_PERTENCES_CATEGORIES } from '../../../../core/mock/inventory.mock';

interface CategoryGroup {
  name: string;
  items: InventoryItem[];
  collapsed: boolean;
}

@Component({
  selector: 'app-pertences-tab',
  standalone: true,
  imports: [StatusDotComponent, SearchInputComponent, FabComponent],
  templateUrl: './pertences-tab.html'
})
export class PertencesTabComponent implements OnInit {
  allItems: InventoryItem[] = [];
  categories: CategoryGroup[] = [];
  searchQuery = '';
  loading = true;
  error = '';

  constructor(
    private householdService: HouseholdService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    const household = this.householdService.getSelectedHousehold();
    if (!household) {
      this.loading = false;
      return;
    }

    this.inventoryService.getItems(household.id).subscribe({
      next: items => {
        this.allItems = items;
        this.buildCategories(items);
        this.loading = false;
      },
      error: () => {
        this.error = 'Erro ao carregar os pertences.';
        this.loading = false;
      }
    });
  }

  private buildCategories(items: InventoryItem[]): void {
    const tagMap: Record<string, InventoryItem[]> = {};

    for (const item of items) {
      const tags = item.tags;
      const category = Array.isArray(tags) && tags.length > 0 ? tags[0] : 'Outros';
      if (!tagMap[category]) tagMap[category] = [];
      tagMap[category].push(item);
    }

    this.categories = [
      ...MOCK_PERTENCES_CATEGORIES.filter(c => tagMap[c]).map(c => ({
        name: c,
        items: tagMap[c],
        collapsed: false
      })),
      ...Object.keys(tagMap)
        .filter(c => !MOCK_PERTENCES_CATEGORIES.includes(c))
        .map(c => ({ name: c, items: tagMap[c], collapsed: false }))
    ];
  }

  get filteredCategories(): CategoryGroup[] {
    if (!this.searchQuery.trim()) return this.categories;
    const q = this.searchQuery.toLowerCase();
    return this.categories
      .map(c => ({ ...c, items: c.items.filter(i => i.name.toLowerCase().includes(q)) }))
      .filter(c => c.items.length > 0);
  }

  toggleCategory(category: CategoryGroup): void {
    category.collapsed = !category.collapsed;
  }

  formatValue(value: number | undefined): string {
    if (!value) return '';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  }

  getItemStatus(item: InventoryItem): 'ok' | 'warning' {
    return item.destination === 'Trash' || item.destination === 'Donate' ? 'warning' : 'ok';
  }
}
