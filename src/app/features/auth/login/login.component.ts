import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
    loginForm!: FormGroup;
    isLoading = false;
    hidePassword = true;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.initForm();
        // Pré-preenche os campos automaticamente em ambiente de desenvolvimento (fora de produção)
        // e evita fazê-lo durante testes unitários (onde o objeto global jasmine está presente)
        if (!environment.production && typeof window !== 'undefined' && typeof (window as any).jasmine === 'undefined') {
            this.loginForm.patchValue({
                email: 'teste@andestripmanager.com',
                senha: 'senha123'
            });
        }
    }

    /**
     * Inicializa o formulário de login
     */
    private initForm(): void {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            senha: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    /**
     * Realiza o login
     */
    async onLogin(): Promise<void> {
        if (this.loginForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.isLoading = true;
        this.cdr.markForCheck();

        try {
            const { email, senha } = this.loginForm.value;
            await this.authService.login(email, senha);

            this.snackBar.open('Login realizado com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });

            // Aguardar um pouco para garantir que o estado foi atualizado
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            this.snackBar.open(error.message || 'Erro ao fazer login', 'Fechar', {
                duration: 5000,
                panelClass: ['error-snackbar']
            });
        } finally {
            this.isLoading = false;
            this.cdr.markForCheck();
        }
    }

    /**
     * Navega para recuperação de senha
     */
    onForgotPassword(): void {
        this.router.navigate(['/auth/forgot-password']);
    }

    /**
     * Navega para registro
     */
    onRegister(): void {
        this.router.navigate(['/auth/register']);
    }

    /**
     * Obtém mensagem de erro para um campo
     */
    getErrorMessage(fieldName: string): string {
        const field = this.loginForm.get(fieldName);

        if (field?.hasError('required')) {
            return 'Este campo é obrigatório';
        }

        if (field?.hasError('email')) {
            return 'Email deve ter um formato válido';
        }

        if (field?.hasError('minlength')) {
            return 'A senha deve ter pelo menos 6 caracteres';
        }

        return '';
    }

    /**
     * Marca todos os campos como tocados para exibir erros
     */
    private markFormGroupTouched(): void {
        Object.keys(this.loginForm.controls).forEach(key => {
            const control = this.loginForm.get(key);
            control?.markAsTouched();
        });
    }
}