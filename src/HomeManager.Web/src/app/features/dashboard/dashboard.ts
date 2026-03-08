import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HouseholdService } from '../../core/services/household.service';
import { Household } from '../../core/models/household.model';
import { WelcomeComponent } from './welcome/welcome';
import { ItemListComponent } from '../inventory/item-list/item-list';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    WelcomeComponent,
    ItemListComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  households$!: Observable<Household[]>;
  loading = true;

  constructor(private householdService: HouseholdService) {}

  ngOnInit() {
    this.households$ = this.householdService.getMyHouseholds();
    this.households$.subscribe(() => this.loading = false);
  }
}
