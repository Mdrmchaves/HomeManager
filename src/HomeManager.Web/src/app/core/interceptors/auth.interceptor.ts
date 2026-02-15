import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { from, switchMap, catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabaseService = inject(SupabaseService);

  // Só adiciona token para chamadas à nossa API
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  console.log('🔐 Interceptor: Attempting to add token to request:', req.url);

  // Pega o token do Supabase
  return from(supabaseService.getAccessToken()).pipe(
    switchMap(token => {
      console.log('🔐 Token retrieved:', token ? 'YES ✅' : 'NO ❌');

      if (token) {
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('🔐 Request cloned with Authorization header');
        return next(cloned);
      }

      console.warn('⚠️ No token found, sending request without auth');
      return next(req);
    }),
    catchError(error => {
      console.error('❌ Error in auth interceptor:', error);
      return throwError(() => error);
    })
  );
};
