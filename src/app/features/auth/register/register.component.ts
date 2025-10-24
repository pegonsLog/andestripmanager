import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
    selector: 'app-register',
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
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
    registerForm!: FormGroup;
    isLoading = false;
    hidePassword = true;
    hideConfirmPassword = true;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.initForm();
    }

    /**
     * Inicializa o formulário de registro
     */
    private initForm(): void {
        this.registerForm = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            senha: ['', [Validators.required, Validators.minLength(6)]],
            confirmarSenha: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    /**
     * Validador para confirmar se as senhas coincidem
     */
    private passwordMatchValidator(form: FormGroup) {
        const senha = form.get('senha');
        const confirmarSenha = form.get('confirmarSenha');

        if (senha && confirmarSenha && senha.value !== confirmarSenha.value) {
            confirmarSenha.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }

        return null;
    }

    /**
     * Realiza o registro
     */
    async onRegister(): Promise<void> {
        if (this.registerForm.invalid) {
            this.markFormGroupTouched();
            this.snackBar.open('Por favor, corrija os erros no formulário antes de continuar', 'Fechar', {
                duration: 4000,
                panelClass: ['error-snackbar'],
                verticalPosition: 'top'
            });
            return;
        }

        this.isLoading = true;

        try {
            const formValue = this.registerForm.value;
            const { email, senha, nome } = formValue;

            // Construir objeto de dados adicionais
            const dadosAdicionais = { nome };

            await this.authService.register(email, senha, dadosAdicionais);

            this.snackBar.open('Conta criada com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });

            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            const errorMessage = error.message || 'Erro ao criar conta';
            const duration = errorMessage.includes('email já está cadastrado') ? 8000 : 5000;

            this.snackBar.open(errorMessage, 'Fechar', {
                duration: duration,
                panelClass: ['error-snackbar'],
                verticalPosition: 'top'
            });

            // Se for email duplicado, destacar o campo de email
            if (errorMessage.includes('email já está cadastrado')) {
                const emailControl = this.registerForm.get('email');
                emailControl?.setErrors({ emailDuplicado: true });
                emailControl?.markAsTouched();
            }
        } finally {
            this.isLoading = false;
        }
    }  /**

   * Navega para login
   */
    onLogin(): void {
        this.router.navigate(['/auth/login']);
    }

    /**
     * Cancela o registro e volta para login
     */
    onCancel(): void {
        this.router.navigate(['/auth/login']);
    }

    /**
     * Obtém mensagem de erro para um campo
     */
    getErrorMessage(fieldName: string): string {
        const field = this.registerForm.get(fieldName);

        if (field?.hasError('required')) {
            return 'Este campo é obrigatório';
        }

        if (field?.hasError('email')) {
            return 'Email deve ter um formato válido';
        }

        if (field?.hasError('emailDuplicado')) {
            return 'Este email já está cadastrado';
        }

        if (field?.hasError('minlength')) {
            const requiredLength = field.errors?.['minlength']?.requiredLength;
            return `Deve ter pelo menos ${requiredLength} caracteres`;
        }

        if (field?.hasError('passwordMismatch')) {
            return 'As senhas não coincidem';
        }

        return '';
    }

    /**
     * Marca todos os campos como tocados para exibir erros
     */
    private markFormGroupTouched(): void {
        Object.keys(this.registerForm.controls).forEach(key => {
            const control = this.registerForm.get(key);
            control?.markAsTouched();
        });
    }
}