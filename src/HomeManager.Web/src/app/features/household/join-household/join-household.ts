import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HouseholdService } from '../../../core/services/household.service';

@Component({
  selector: 'app-join-household',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './join-household.html',
  styleUrl: './join-household.scss'
})
export class JoinHouseholdComponent {
  joinForm: FormGroup;
  loading = false;

  constructor(
    private formbuilder: FormBuilder,
    private householdService: HouseholdService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.joinForm = this.formbuilder.group({
      inviteCode: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.joinForm.invalid) {
      return;
    }

    this.loading = true;
    const inviteCode = this.joinForm.value.inviteCode;

    this.householdService.joinHousehold(inviteCode).subscribe({
      next: () => {
        this.snackBar.open('✅ Successfully joined household!', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/dashboard']);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error joining household:', error);
        this.snackBar.open('❌ Error joining household', 'Close', {
          duration: 5000
        });
        this.loading = false;
      }
    });
  }
}
