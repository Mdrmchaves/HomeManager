import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  mode: 'signin' | 'signup' = 'signin';
  email = '';
  password = '';
  name = '';
  loading = false;
  errorMessage = '';
  emailSent = false;
  showPassword = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;

    try {
      if (this.mode === 'signin') {
        await this.supabase.signIn(this.email, this.password);
        this.router.navigate(['/dashboard']);
      } else {
        await this.supabase.signUp(this.email, this.password, this.name);
        this.emailSent = true;
      }
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
    } finally {
      this.loading = false;
    }
  }

  switchMode(m: 'signin' | 'signup'): void {
    this.mode = m;
    this.errorMessage = '';
    this.emailSent = false;
  }

  backToLogin(): void {
    this.emailSent = false;
    this.mode = 'signin';
    this.password = '';
    this.name = '';
    this.errorMessage = '';
  }
}
