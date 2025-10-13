import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Manutencao } from '../../../../models/manutencao.interface';
import { ManutencaoFormComponent } from '../manutencao-form/manutencao-form.component';

export interface ManutencaoFormDialogData {
    viagemId: string;
    manutencao?: Manutencao;
}

/**
 * Dialog para formulário de manutenção
 */
@Component({
    selector: 'app-manutencao-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        ManutencaoFormComponent
    ],
    template: `
        <div class="dialog-header">
            <h5 mat-dialog-title>
                <mat-icon>build</mat-icon>
                {{ data.manutencao ? 'Editar Manutenção' : 'Registrar Manutenção' }}
            </h5>
            <button mat-icon-button mat-dialog-close>
                <mat-icon>close</mat-icon>
            </button>
        </div>

        <mat-dialog-content>
            <app-manutencao-form
                [manutencao]="data.manutencao"
                [viagemId]="data.viagemId"
                (salvar)="onSalvar($event)"
                (cancelar)="onCancelar()">
            </app-manutencao-form>
        </mat-dialog-content>
    `,
    styles: [`
        .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        }

        h5 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 20px;
            font-weight: 500;
        }

        mat-dialog-content {
            padding: 0;
            margin: 0;
            max-height: 80vh;
            overflow-y: auto;
        }

        ::ng-deep app-manutencao-form mat-card {
            box-shadow: none !important;
            margin: 0 !important;
        }

        ::ng-deep app-manutencao-form mat-card-header {
            display: none !important;
        }
    `]
})
export class ManutencaoFormDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<ManutencaoFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ManutencaoFormDialogData
    ) {}

    ngOnInit(): void {
        // Configurações adicionais se necessário
    }

    onSalvar(manutencao: Manutencao): void {
        this.dialogRef.close(manutencao);
    }

    onCancelar(): void {
        this.dialogRef.close(null);
    }
}
