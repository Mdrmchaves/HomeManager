import { Component, signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { HouseholdService } from '../../../core/services/household.service';
import { Household } from '../../../core/models/household.model';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SafeHtmlPipe],
  templateUrl: './app-shell.html'
})
export class AppShellComponent {
  private supabase = inject(SupabaseService);
  private householdService = inject(HouseholdService);
  private router = inject(Router);

  showHouseholdMenu = signal(false);

  private user = this.supabase.getCurrentUser();
  userEmail = this.user?.email ?? '';
  userName = this.user?.user_metadata?.['name'] ?? this.user?.email?.split('@')[0] ?? 'Utilizador';

  households = toSignal(
    this.householdService.getMyHouseholds(),
    { initialValue: [] as Household[] }
  );

  selectedHousehold = toSignal(this.householdService.selectedHousehold$);

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
      path: '/finance',
      label: 'Finanças',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    }
  ];

  selectHousehold(household: Household): void {
    this.householdService.selectHousehold(household);
    this.showHouseholdMenu.set(false);
  }

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}
