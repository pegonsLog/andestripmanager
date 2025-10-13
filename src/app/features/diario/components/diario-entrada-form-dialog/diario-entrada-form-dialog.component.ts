import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

import { DiarioBordo, DiarioBordoForm } from '../../../../models/diario-bordo.interface';
import { DiarioBordoService } from '../../../../services/diario-bordo.service';

export interface DiarioEntradaFormDialogData {
    viagemId: string;
    diaViagemId?: string;
    entrada?: DiarioBordo;
}

/**
 * Dialog para criar/editar entrada de diário
 */
@Component({
    selector: 'app-diario-entrada-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './diario-entrada-form-dialog.component.html',
    styleUrls: ['./diario-entrada-form-dialog.component.scss']
})
export class DiarioEntradaFormDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private diarioBordoService = inject(DiarioBordoService);
    private snackBar = inject(MatSnackBar);

    entradaForm!: FormGroup;
    isLoading = false;
    isEditMode = false;
    tags: string[] = [];
    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    constructor(
        public dialogRef: MatDialogRef<DiarioEntradaFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DiarioEntradaFormDialogData
    ) {}

    ngOnInit(): void {
        this.isEditMode = !!this.data.entrada;
        this.criarFormulario();

        if (this.isEditMode && this.data.entrada) {
            this.preencherFormulario(this.data.entrada);
        }
    }

    private criarFormulario(): void {
        this.entradaForm = this.fb.group({
            titulo: [''],
            conteudo: ['', [Validators.required, Validators.minLength(10)]],
            publico: [false]
        });
    }

    private preencherFormulario(entrada: DiarioBordo): void {
        this.entradaForm.patchValue({
            titulo: entrada.titulo || '',
            conteudo: entrada.conteudo,
            publico: entrada.publico
        });
        this.tags = entrada.tags || [];
    }

    adicionarTag(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        if (value && !this.tags.includes(value)) {
            this.tags.push(value);
        }
        event.chipInput!.clear();
    }

    removerTag(tag: string): void {
        const index = this.tags.indexOf(tag);
        if (index >= 0) {
            this.tags.splice(index, 1);
        }
    }

    async onSubmit(): Promise<void> {
        if (this.entradaForm.invalid) {
            this.marcarCamposComoTocados();
            this.snackBar.open('Por favor, preencha todos os campos obrigatórios.', 'Fechar', { duration: 3000 });
            return;
        }

        this.isLoading = true;

        try {
            const formValue = this.entradaForm.value;
            const dadosEntrada: DiarioBordoForm = {
                titulo: formValue.titulo,
                conteudo: formValue.conteudo,
                publico: formValue.publico,
                tags: this.tags
            };

            if (this.isEditMode && this.data.entrada?.id) {
                await this.diarioBordoService.atualizarEntrada(this.data.entrada.id, dadosEntrada);
                this.snackBar.open('Entrada atualizada com sucesso!', 'Fechar', { duration: 3000 });
            } else {
                await this.diarioBordoService.criarEntrada(
                    this.data.viagemId,
                    dadosEntrada,
                    this.data.diaViagemId
                );
                this.snackBar.open('Entrada criada com sucesso!', 'Fechar', { duration: 3000 });
            }

            this.dialogRef.close(true);
        } catch (error) {
            console.error('Erro ao salvar entrada:', error);
            this.snackBar.open('Erro ao salvar entrada. Tente novamente.', 'Fechar', { duration: 5000 });
        } finally {
            this.isLoading = false;
        }
    }

    onCancelar(): void {
        this.dialogRef.close(false);
    }

    private marcarCamposComoTocados(): void {
        Object.keys(this.entradaForm.controls).forEach(key => {
            this.entradaForm.get(key)?.markAsTouched();
        });
    }

    temErro(campo: string): boolean {
        const control = this.entradaForm.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    obterMensagemErro(campo: string): string {
        const control = this.entradaForm.get(campo);
        if (control?.errors) {
            if (control.errors['required']) return 'Este campo é obrigatório';
            if (control.errors['minlength']) return `Mínimo de ${control.errors['minlength'].requiredLength} caracteres`;
        }
        return '';
    }
}
