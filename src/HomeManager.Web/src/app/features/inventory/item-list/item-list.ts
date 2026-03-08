import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InventoryService } from '../../../core/services/inventory.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Household } from '../../../core/models/household.model';
import { InventoryItem } from '../../../core/models/inventory-item.model';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './item-list.html',
  styleUrl: './item-list.scss'
})
export class ItemListComponent implements OnChanges {
  @Input() households: Household[] = [];

  loading = true;
  items: InventoryItem[] = [];
  error = '';

  selectedHouseholdName = '';

  deletingId: string | null = null;
  signedUrls: Record<string, string> = {};

  constructor(
    private inventoryService: InventoryService,
    private supabaseService: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['households'] && this.households.length > 0) {
      this.selectedHouseholdName = this.households[0].name;
      this.loadItems();
    }
  }

  deleteItem(item: InventoryItem): void {
    if (!confirm(`Delete "${item.name}"?`)) return;

    this.deletingId = item.id;
    this.inventoryService.deleteItem(item.id).subscribe({
      next: () => {
        this.items = this.items.filter(i => i.id !== item.id);
        this.deletingId = null;
        this.snackBar.open('Item deleted', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error deleting item:', err);
        this.snackBar.open('Error deleting item', 'Close', { duration: 5000 });
        this.deletingId = null;
      }
    });
  }

  loadItems() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getItems(this.households[0].id).subscribe({
      next: async (items) => {
        this.items = items;
        const paths = items.map(i => i.photoUrl).filter(Boolean) as string[];
        if (paths.length > 0) {
          this.signedUrls = await this.supabaseService.createSignedUrls(paths);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading items:', err);
        this.error = err.message || 'Failed to load items';
        this.loading = false;
      }
    });
  }
}
