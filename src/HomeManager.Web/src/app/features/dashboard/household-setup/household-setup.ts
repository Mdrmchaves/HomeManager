import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HouseholdService } from '../../../core/services/household.service';

@Component({
  selector: 'app-household-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './household-setup.html'
})
export class HouseholdSetupComponent {
  mode: 'create' | 'join' = 'create';
  householdName = '';
  inviteCode = '';
  loading = false;
  error = '';

  constructor(private householdService: HouseholdService, private router: Router) {}

  switchMode(m: 'create' | 'join'): void {
    this.mode = m;
    this.error = '';
  }

  async submit(): Promise<void> {
    this.error = '';
    this.loading = true;

    try {
      if (this.mode === 'create') {
        await this.householdService.createHousehold({ name: this.householdName }).toPromise();
      } else {
        await this.householdService.joinHousehold(this.inviteCode).toPromise();
      }
      window.location.reload();
    } catch {
      this.error = this.mode === 'create'
        ? 'Não foi possível criar o agregado.'
        : 'Código de convite inválido ou já utilizado.';
    } finally {
      this.loading = false;
    }
  }
}
