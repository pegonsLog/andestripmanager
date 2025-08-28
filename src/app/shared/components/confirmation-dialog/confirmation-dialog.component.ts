import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface ConfirmationDialogData {
    titulo: string;
    mensagem: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'warning' | 'danger' | 'info';
    icone?: string;
    requerConfirmacaoTexto?: boolean;
    textoParaConfirmar?: string;
}

@Component({
    selector: 'app-confirmation-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule
    ],
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationDialogComponent {
    confirmacaoTextoControl = new FormControl('');

    constructor(
        public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
    ) {
        // Definir valores padrão
        this.data.textoConfirmar = this.data.textoConfirmar || 'Confirmar';
        this.data.textoCancelar = this.data.textoCancelar || 'Cancelar';
        this.data.tipo = this.data.tipo || 'warning';
        this.data.icone = this.data.icone || this.getDefaultIcon();
        this.data.requerConfirmacaoTexto = this.data.requerConfirmacaoTexto || false;
        this.data.textoParaConfirmar = this.data.textoParaConfirmar || 'EXCLUIR';

        // Configurar validação se necessário
        if (this.data.requerConfirmacaoTexto) {
            this.confirmacaoTextoControl.setValidators([
                Validators.required,
                Validators.pattern(new RegExp(`^${this.data.textoParaConfirmar}$`, 'i'))
            ]);
        }
    }

    /**
     * Confirma a ação
     */
    onConfirmar(): void {
        // Se requer confirmação por texto, validar primeiro
        if (this.data.requerConfirmacaoTexto) {
            if (this.confirmacaoTextoControl.invalid) {
                this.confirmacaoTextoControl.markAsTouched();
                return;
            }
        }

        this.dialogRef.close(true);
    }

    /**
     * Cancela a ação
     */
    onCancelar(): void {
        this.dialogRef.close(false);
    }

    /**
     * Retorna ícone padrão baseado no tipo
     */
    private getDefaultIcon(): string {
        switch (this.data.tipo) {
            case 'danger':
                return 'warning';
            case 'warning':
                return 'help_outline';
            case 'info':
                return 'info';
            default:
                return 'help_outline';
        }
    }

    /**
     * Retorna classe CSS baseada no tipo
     */
    getTipoClass(): string {
        return `dialog-${this.data.tipo}`;
    }

    /**
     * Retorna cor do botão de confirmação
     */
    getCorBotaoConfirmar(): string {
        switch (this.data.tipo) {
            case 'danger':
                return 'warn';
            case 'warning':
                return 'accent';
            case 'info':
                return 'primary';
            default:
                return 'primary';
        }
    }

    /**
     * Verifica se pode confirmar
     */
    podeConfirmar(): boolean {
        if (this.data.requerConfirmacaoTexto) {
            return this.confirmacaoTextoControl.valid;
        }
        return true;
    }

    /**
     * Retorna mensagem de erro para confirmação por texto
     */
    getMensagemErroConfirmacao(): string {
        if (this.confirmacaoTextoControl.hasError('required')) {
            return 'Digite o texto de confirmação';
        }
        if (this.confirmacaoTextoControl.hasError('pattern')) {
            return `Digite "${this.data.textoParaConfirmar}" para confirmar`;
        }
        return '';
    }
}