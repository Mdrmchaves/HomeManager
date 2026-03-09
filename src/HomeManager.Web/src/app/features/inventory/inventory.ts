import { Component } from '@angular/core';
import { PillTabsComponent } from '../../shared/components/pill-tabs/pill-tabs';
import { PertencesTabComponent } from './components/pertences-tab/pertences-tab';
import { DespensaTabComponent } from './components/despensa-tab/despensa-tab';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [PillTabsComponent, PertencesTabComponent, DespensaTabComponent],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-stone-800">Inventário</h1>
        <app-pill-tabs
          [tabs]="tabs"
          [activeIndex]="activeTab"
          (tabChange)="activeTab = $event"
        />
      </div>

      @if (activeTab === 0) {
        <app-pertences-tab />
      } @else {
        <app-despensa-tab />
      }
    </div>
  `
})
export class InventoryComponent {
  tabs = ['Pertences', 'Despensa'];
  activeTab = 0;
}
