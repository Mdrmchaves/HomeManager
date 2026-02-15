import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../../core/services/supabase.service';
import { HouseholdService } from '../../../core/services/household.service';
import { InventoryService } from '../../../core/services/inventory.service';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './item-list.html',
  styleUrl: './item-list.scss'
})
export class ItemListComponent implements OnInit {
  userEmail = '';
  loading = true;
  households: any[] = [];
  items: any[] = [];
  error = '';

  constructor(
    private supabase: SupabaseService,
    private householdService: HouseholdService,
    private inventoryService: InventoryService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.supabase.getCurrentUser();
    this.userEmail = user?.email || '';

    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    this.error = '';

    try {
      // Test 1: Load households
      this.households = await this.householdService.getMyHouseholds().toPromise() || [];
      console.log('Households loaded:', this.households);

      // Test 2: Load items (if has household)
      if (this.households.length > 0) {
        this.items = await this.inventoryService.getItems(this.households[0].id).toPromise() || [];
        console.log('Items loaded:', this.items);
      }

    } catch (err: any) {
      console.error('Error loading data:', err);
      this.error = err.message || 'Failed to load data';
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
