import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

const ADMIN_EMAIL = 'pegons.log@gmail.com';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    map(user => {
      if (user && user.email === ADMIN_EMAIL) {
        return true;
      }
      
      // Redirecionar para dashboard se não for admin
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
