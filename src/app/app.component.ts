import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './core/services/auth.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatSnackBarModule
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'Andes Trip Manager';
    
    private authService = inject(AuthService);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);
    
    isAuthenticated$: Observable<boolean> = this.authService.isAuthenticated$;
    
    async fazerLogout(): Promise<void> {
        try {
            await this.authService.logout();
            this.snackBar.open('Logout realizado com sucesso!', 'Fechar', { duration: 3000 });
            this.router.navigate(['/auth/login']);
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            this.snackBar.open('Erro ao fazer logout. Tente novamente.', 'Fechar', { duration: 5000 });
        }
    }
}