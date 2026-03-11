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
  successMessage = '';
  showPassword = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async submit(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    try {
      if (this.mode === 'signin') {
        await this.supabase.signIn(this.email, this.password);
        this.router.navigate(['/dashboard']);
      } else {
        await this.supabase.signUp(this.email, this.password, this.name);
        this.successMessage = 'Conta criada! Verifique o seu email para confirmar o registo.';
        this.mode = 'signin';
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
    this.successMessage = '';
  }
}
