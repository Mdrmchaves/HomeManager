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
import { Household } from '../../../core/models/household.model';

@Component({
  selector: 'app-create-household',
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
  templateUrl: './create-household.html',
  styleUrl: './create-household.scss'
})
export class CreateHouseholdComponent {
  householdForm: FormGroup;
  loading = false;
  inviteCode: string | null = null;

  constructor(
    private formbuilder: FormBuilder,
    private householdService: HouseholdService,
    public router: Router,
    private snackBar: MatSnackBar
  ) {
    this.householdForm = this.formbuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  onSubmit() {
    if (this.householdForm.invalid) {
      return;
    }

    this.loading = true;

    this.householdService
      .createHousehold({ name: this.householdForm.value.name })
      .subscribe({
        next: (response: Household) => {
          this.inviteCode = response.inviteCode || null;

          this.snackBar.open('✅ Household created successfully!', 'Close', {
            duration: 3000
          });

          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 3000);

          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating household:', error);
          this.snackBar.open('❌ Error creating household', 'Close', {
            duration: 5000
          });
          this.loading = false;
        }
      });
  }

  copyInviteCode() {
    if (this.inviteCode) {
      navigator.clipboard.writeText(this.inviteCode);
      this.snackBar.open('📋 Invite code copied!', 'Close', {
        duration: 2000
      });
    }
  }
}
