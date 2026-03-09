import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { HouseholdService } from '../../../core/services/household.service';
import { Household } from '../../../core/models/household.model';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './app-shell.html'
})
export class AppShellComponent implements OnInit {
  households$!: Observable<Household[]>;
  selectedHousehold$!: Observable<Household | null>;
  userEmail = '';
  userName = '';
  showHouseholdMenu = false;

  navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Início',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`
    },
    {
      path: '/inventory',
      label: 'Inventário',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`
    },
    {
      path: '/tasks',
      label: 'Tarefas',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`
    },
    {
      path: '/budget',
      label: 'Orçamento',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`
    }
  ];

  constructor(
    private supabase: SupabaseService,
    private householdService: HouseholdService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.supabase.getCurrentUser();
    this.userEmail = user?.email ?? '';
    this.userName = user?.user_metadata?.['name'] ?? user?.email?.split('@')[0] ?? 'Utilizador';

    this.selectedHousehold$ = this.householdService.selectedHousehold$;
    this.households$ = this.householdService.getMyHouseholds();
  }

  selectHousehold(household: Household): void {
    this.householdService.selectHousehold(household);
    this.showHouseholdMenu = false;
  }

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}
