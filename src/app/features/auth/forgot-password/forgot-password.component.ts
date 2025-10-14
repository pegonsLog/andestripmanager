import { Component, ChangeDetectionStrategy } from '@angular/core';
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

import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
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
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
    forgotPasswordForm!: FormGroup;
    isLoading = false;
    emailSent = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar
    ) {
        this.initForm();
    }

    /**
     * Inicializa o formulário de recuperação de senha
     */
    private initForm(): void {
        this.forgotPasswordForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    /**
     * Envia email de recuperação de senha
     */
    async onSubmit(): Promise<void> {
        if (this.forgotPasswordForm.invalid) {
            this.forgotPasswordForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;

        try {
            const { email } = this.forgotPasswordForm.value;
            await this.authService.resetPassword(email);

            this.emailSent = true;
            this.snackBar.open('Email de recuperação enviado com sucesso!', 'Fechar', {
                duration: 5000,
                panelClass: ['success-snackbar']
            });
        } catch (error: any) {
            this.snackBar.open(error.message || 'Erro ao enviar email de recuperação', 'Fechar', {
                duration: 5000,
                panelClass: ['error-snackbar']
            });
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Volta para a tela de login
     */
    onBackToLogin(): void {
        this.router.navigate(['/auth/login']);
    }

    /**
     * Obtém mensagem de erro para o campo email
     */
    getErrorMessage(): string {
        const field = this.forgotPasswordForm.get('email');

        if (field?.hasError('required')) {
            return 'Este campo é obrigatório';
        }

        if (field?.hasError('email')) {
            return 'Email deve ter um formato válido';
        }

        return '';
    }
}
