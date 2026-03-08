import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./item-list/item-list').then(m => m.ItemListComponent)
  },
  {
    path: 'item/new',
    loadComponent: () => import('./item-form/item-form').then(m => m.ItemFormComponent)
  }
];