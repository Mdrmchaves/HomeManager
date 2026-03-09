import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { StatusDotComponent } from '../../../../shared/components/status-dot/status-dot';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input';
import { FabComponent } from '../../../../shared/components/fab/fab';
import { MOCK_PANTRY_CATEGORIES, MockPantryCategory, MockPantryItem } from '../../../../core/mock/inventory.mock';

@Component({
  selector: 'app-despensa-tab',
  standalone: true,
  imports: [StatusDotComponent, SearchInputComponent, FabComponent],
  templateUrl: './despensa-tab.html'
})
export class DespensaTabComponent {
  categories: (MockPantryCategory & { collapsed: boolean })[] = MOCK_PANTRY_CATEGORIES.map(c => ({
    ...c,
    collapsed: false
  }));
  searchQuery = '';

  get filteredCategories(): (MockPantryCategory & { collapsed: boolean })[] {
    if (!this.searchQuery.trim()) return this.categories;
    const q = this.searchQuery.toLowerCase();
    return this.categories
      .map(c => ({ ...c, items: c.items.filter(i => i.name.toLowerCase().includes(q)) }))
      .filter(c => c.items.length > 0);
  }

  toggleCategory(category: MockPantryCategory & { collapsed: boolean }): void {
    category.collapsed = !category.collapsed;
  }

  isLow(item: MockPantryItem): boolean {
    return item.status === 'low' || item.status === 'warning';
  }
}
