import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './recover-password.html'
})
export class RecoverPasswordComponent {
  email = '';
  loading = false;
  errorMessage = '';
  emailSent = false;

  constructor(private supabase: SupabaseService) {}

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    try {
      await this.supabase.resetPasswordForEmail(this.email);
      this.emailSent = true;
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
    } finally {
      this.loading = false;
    }
  }

  reset(): void {
    this.emailSent = false;
    this.email = '';
    this.errorMessage = '';
  }
}
