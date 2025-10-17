import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { DiarioBordo } from '../../../../models/diario-bordo.interface';
import { GaleriaFotosComponent } from '../galeria-fotos.component';

@Component({
    selector: 'app-diario-entrada-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        GaleriaFotosComponent
    ],
    templateUrl: './diario-entrada-detail-dialog.component.html',
    styleUrls: ['./diario-entrada-detail-dialog.component.scss']
})
export class DiarioEntradaDetailDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<DiarioEntradaDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { entrada: DiarioBordo; nomeDiaViagem?: string }
    ) { }

    fechar(): void {
        this.dialogRef.close();
    }

    formatarTimestamp(timestamp: unknown): string {
        if (!timestamp) return '';
        const date = (timestamp as { toDate?: () => Date }).toDate 
            ? (timestamp as { toDate: () => Date }).toDate() 
            : new Date(timestamp as string | number | Date);
        return date.toLocaleString('pt-BR');
    }

    converterFotosParaGaleria(fotos: string[]): Array<{ url: string; nome: string; data: string }> {
        return fotos.map(url => ({
            url,
            nome: 'Foto do diário',
            data: new Date().toLocaleDateString('pt-BR')
        }));
    }
}
