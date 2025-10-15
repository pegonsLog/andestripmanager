import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DiaViagem } from '../../../models';
import { DiaViagemDetailComponent } from '../dia-viagem-detail/dia-viagem-detail.component';

export interface DiaViagemDetailDialogData {
    dia: DiaViagem;
    viagemNome?: string;
}

@Component({
    selector: 'app-dia-viagem-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        DiaViagemDetailComponent
    ],
    templateUrl: './dia-viagem-detail-dialog.component.html',
    styleUrls: ['./dia-viagem-detail-dialog.component.scss']
})
export class DiaViagemDetailDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<DiaViagemDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DiaViagemDetailDialogData
    ) {}
}
