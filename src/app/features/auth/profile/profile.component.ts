import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { StorageService } from '../../../core/services/storage.service';
import { Usuario, DadosMotocicleta, cpfValidator, telefoneValidator } from '../../../models';

/**
 * Componente para edição de perfil do usuário
 * Permite editar dados pessoais, foto de perfil e dados da motocicleta
 */
@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatDividerModule
    ],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit, OnDestroy {
    private readonly authService = inject(AuthService);
    private readonly storageService = inject(StorageService);
    private readonly fb = inject(FormBuilder);
    private readonly snackBar = inject(MatSnackBar);
    private readonly destroy$ = new Subject<void>();

    // Formulários
    perfilForm!: FormGroup;
    motocicletaForm!: FormGroup;

    // Estados do componente
    isLoading = false;
    isSaving = false;
    isUploadingPhoto = false;

    // Dados do usuário
    usuario: Usuario | null = null;
    fotoPreview: string | null = null;
    selectedFile: File | null = null;

    ngOnInit(): void {
        this.initializeForms();
        this.loadUserData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Inicializa os formulários reativos
     */
    private initializeForms(): void {
        this.perfilForm = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(2)]],
            email: [{ value: '', disabled: true }], // Email não pode ser alterado
            cpf: ['', [cpfValidator]],
            telefone: ['', [telefoneValidator]]
        });

        this.motocicletaForm = this.fb.group({
            marca: ['', [Validators.required]],
            modelo: ['', [Validators.required]],
            ano: ['', [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
            placa: [''],
            cor: [''],
            cilindrada: ['', [Validators.min(50)]],
            capacidadeTanque: ['', [Validators.min(1)]],
            consumoMedio: ['', [Validators.min(1)]]
        });
    }

    /**
     * Carrega dados do usuário atual
     */
    private loadUserData(): void {
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(usuario => {
                if (usuario) {
                    this.usuario = usuario;
                    this.populateForm(usuario);
                    this.fotoPreview = usuario.fotoUrl || null;
                }
            });
    }

    /**
     * Popula os formulários com dados do usuário
     */
    private populateForm(usuario: Usuario): void {
        this.perfilForm.patchValue({
            nome: usuario.nome,
            email: usuario.email,
            cpf: usuario.cpf || '',
            telefone: usuario.telefone || ''
        });

        if (usuario.motocicleta) {
            this.motocicletaForm.patchValue(usuario.motocicleta);
        }
    }

    /**
     * Manipula seleção de arquivo de foto
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];

            // Validar arquivo usando o StorageService
            const validation = this.storageService.validateImageFile(file);
            if (!validation.valid) {
                this.snackBar.open(validation.error!, 'Fechar', {
                    duration: 3000
                });
                return;
            }

            this.selectedFile = file;

            // Criar preview da imagem
            const reader = new FileReader();
            reader.onload = (e) => {
                this.fotoPreview = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * Remove foto de perfil
     */
    async removeFoto(): Promise<void> {
        if (!this.usuario?.id) return;

        this.isUploadingPhoto = true;

        try {
            // Remover foto do Storage se existir
            if (this.usuario.fotoUrl) {
                await this.storageService.deleteProfilePhoto(this.usuario.id).toPromise();
            }

            // Atualizar dados do usuário
            await this.authService.updateUserData({ fotoUrl: undefined });

            this.fotoPreview = null;
            this.selectedFile = null;

            this.snackBar.open('Foto removida com sucesso!', 'Fechar', {
                duration: 3000
            });
        } catch (error) {
            console.error('Erro ao remover foto:', error);
            this.snackBar.open('Erro ao remover foto', 'Fechar', {
                duration: 3000
            });
        } finally {
            this.isUploadingPhoto = false;
        }
    }

    /**
     * Faz upload da foto para Firebase Storage
     */
    private async uploadFoto(): Promise<string | null> {
        if (!this.selectedFile || !this.usuario?.id) {
            return null;
        }

        this.isUploadingPhoto = true;

        try {
            // Comprimir imagem antes do upload
            const compressedFile = await this.storageService.compressImage(
                this.selectedFile,
                400, // largura máxima
                400, // altura máxima
                0.8  // qualidade
            );

            // Fazer upload da imagem comprimida
            const fotoUrl = await this.storageService.uploadProfilePhoto(
                this.usuario.id,
                compressedFile
            ).toPromise();

            this.snackBar.open('Foto atualizada com sucesso!', 'Fechar', {
                duration: 3000
            });

            return fotoUrl!;
        } catch (error) {
            console.error('Erro ao fazer upload da foto:', error);
            this.snackBar.open('Erro ao fazer upload da foto', 'Fechar', {
                duration: 3000
            });
            return null;
        } finally {
            this.isUploadingPhoto = false;
        }
    }

    /**
     * Salva dados do perfil
     */
    async onSalvarPerfil(): Promise<void> {
        if (this.perfilForm.invalid) {
            this.markFormGroupTouched(this.perfilForm);
            return;
        }

        this.isSaving = true;

        try {
            let fotoUrl = this.usuario?.fotoUrl;

            // Upload da foto se houver arquivo selecionado
            if (this.selectedFile) {
                const uploadedUrl = await this.uploadFoto();
                fotoUrl = uploadedUrl || undefined;
            }

            // Preparar dados para atualização
            const dadosAtualizados: Partial<Usuario> = {
                ...this.perfilForm.value,
                fotoUrl: fotoUrl || undefined
            };

            // Atualizar dados no Firebase
            await this.authService.updateUserData(dadosAtualizados);

            this.snackBar.open('Perfil atualizado com sucesso!', 'Fechar', {
                duration: 3000
            });

            this.selectedFile = null;
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            this.snackBar.open('Erro ao salvar perfil', 'Fechar', {
                duration: 3000
            });
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Salva dados da motocicleta
     */
    async onSalvarMotocicleta(): Promise<void> {
        if (this.motocicletaForm.invalid) {
            this.markFormGroupTouched(this.motocicletaForm);
            return;
        }

        this.isSaving = true;

        try {
            const dadosMotocicleta: DadosMotocicleta = this.motocicletaForm.value;

            await this.authService.updateUserData({
                motocicleta: dadosMotocicleta
            });

            this.snackBar.open('Dados da motocicleta salvos com sucesso!', 'Fechar', {
                duration: 3000
            });
        } catch (error) {
            console.error('Erro ao salvar dados da motocicleta:', error);
            this.snackBar.open('Erro ao salvar dados da motocicleta', 'Fechar', {
                duration: 3000
            });
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Marca todos os campos do formulário como tocados para exibir erros
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Obtém mensagem de erro para um campo específico
     */
    getErrorMessage(formGroup: FormGroup, fieldName: string): string {
        const control = formGroup.get(fieldName);

        if (control?.hasError('required')) {
            return 'Este campo é obrigatório';
        }

        if (control?.hasError('minlength')) {
            const requiredLength = control.errors?.['minlength']?.requiredLength;
            return `Mínimo de ${requiredLength} caracteres`;
        }

        if (control?.hasError('min')) {
            const min = control.errors?.['min']?.min;
            return `Valor mínimo: ${min}`;
        }

        if (control?.hasError('max')) {
            const max = control.errors?.['max']?.max;
            return `Valor máximo: ${max}`;
        }

        if (control?.hasError('cpfInvalido')) {
            return 'CPF inválido';
        }

        if (control?.hasError('telefoneInvalido')) {
            return 'Telefone inválido';
        }

        return '';
    }
}