import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './update-password.html'
})
export class UpdatePasswordComponent implements OnInit {
  password = '';
  passwordConfirm = '';
  loading = false;
  errorMessage = '';
  success = false;
  showPassword = false;
  showPasswordConfirm = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  ngOnInit(): void {
    // Supabase auto-signs-in from the recovery link fragment; if there's no session
    // after a short delay, the user navigated here directly — redirect to login.
    setTimeout(async () => {
      const session = await this.supabase.getSession();
      if (!session) {
        this.router.navigate(['/login']);
      }
    }, 1000);
  }

  get passwordsMatch(): boolean {
    return this.password === this.passwordConfirm;
  }

  async submit(): Promise<void> {
    if (!this.passwordsMatch) {
      this.errorMessage = 'As palavras-passe não coincidem.';
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    try {
      await this.supabase.updatePassword(this.password);
      this.success = true;
      setTimeout(() => this.router.navigate(['/dashboard']), 2500);
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
    } finally {
      this.loading = false;
    }
  }
}
