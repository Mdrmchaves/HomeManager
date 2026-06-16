import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'recover-password',
    loadComponent: () => import('./features/recover-password/recover-password').then(m => m.RecoverPasswordComponent)
  },
  {
    path: 'update-password',
    loadComponent: () => import('./features/update-password/update-password').then(m => m.UpdatePasswordComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/layouts/app-shell/app-shell').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory').then(m => m.InventoryComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then(m => m.TasksComponent)
      },
      {
        path: 'budget',
        loadComponent: () => import('./features/budget/budget').then(m => m.BudgetComponent)
      },
      {
        path: 'finance',
        loadComponent: () => import('./features/finance/finance').then(m => m.FinanceComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
