import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadChildren: () => import('./features/inventory/inventory.routes').then(m => m.inventoryRoutes)
  },
  {
    path: 'household/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/household/create-household/create-household').then(m => m.CreateHouseholdComponent)
  },
  {
    path: 'household/join',
    canActivate: [authGuard],
    loadComponent: () => import('./features/household/join-household/join-household').then(m => m.JoinHouseholdComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
