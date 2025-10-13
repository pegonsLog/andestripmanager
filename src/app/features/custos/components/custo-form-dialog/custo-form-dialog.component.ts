import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Custo } from '../../../../models';
import { CustoFormComponent } from '../custo-form/custo-form.component';

export interface CustoFormDialogData {
    viagemId: string;
    custo?: Custo;
    diaViagemId?: string;
}

/**
 * Dialog para formulário de custo
 * Encapsula o CustoFormComponent em um dialog
 */
@Component({
    selector: 'app-custo-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        CustoFormComponent
    ],
    template: `
        <div class="custo-form-dialog">
            <div class="dialog-header">
                <h5 mat-dialog-title>
                    <mat-icon>{{ data.custo ? 'edit' : 'add' }}</mat-icon>
                    {{ data.custo ? 'Editar Custo' : 'Adicionar Custo' }}
</h5>
                <button mat-icon-button (click)="onFechar()" class="close-button">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content>
                <app-custo-form
                    [viagemId]="data.viagemId"
                    [custo]="data.custo"
                    [diaViagemId]="data.diaViagemId"
                    (custoSalvo)="onCustoSalvo($event)"
                    (cancelar)="onFechar()">
                </app-custo-form>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        .custo-form-dialog {
            display: flex;
            flex-direction: column;
            max-height: 90vh;
        }

        .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px 0;
            margin-bottom: 16px;
        }

        h5 {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            font-size: 20px;
            font-weight: 500;
        }

        .close-button {
            margin-right: -12px;
        }

        mat-dialog-content {
            padding: 0 24px;
            overflow-y: auto;
            flex: 1;
        }

        ::ng-deep .custo-form-dialog .mat-mdc-dialog-content {
            max-height: calc(90vh - 100px);
        }
    `]
})
export class CustoFormDialogComponent {
    data = inject<CustoFormDialogData>(MAT_DIALOG_DATA);
    private dialogRef = inject(MatDialogRef<CustoFormDialogComponent>);

    onCustoSalvo(custo: Custo): void {
        this.dialogRef.close(custo);
    }

    onFechar(): void {
        this.dialogRef.close();
    }
}
