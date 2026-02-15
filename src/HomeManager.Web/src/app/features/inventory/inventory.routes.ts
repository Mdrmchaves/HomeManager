import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./item-list/item-list').then(m => m.ItemListComponent)
  }
];