import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { DiaViagem } from '../../../models';

export interface SelectDiaDialogData {
  dias: DiaViagem[];
}

@Component({
  selector: 'app-select-dia-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatRadioModule
  ],
  template: `
    <p mat-dialog-title>
      <mat-icon>calendar_today</mat-icon>
      Selecione o Dia da Viagem
    </p>

    <div mat-dialog-content>
      <p>Escolha o dia ao qual você deseja adicionar a nova parada:</p>

      <mat-selection-list [multiple]="false">
        <mat-list-option *ngFor="let dia of data.dias" [selected]="selectedDiaId === dia.id" (click)="onSelect(dia)">
          <div class="dia-row">
            <div class="dia-num">Dia {{ dia.numeroDia }}</div>
            <div class="dia-info">
              <div class="dia-data">{{ dia.data | date: 'dd/MM/yyyy' }}</div>
              <div class="dia-rota">{{ dia.origem }} → {{ dia.destino }}</div>
            </div>
          </div>
        </mat-list-option>
      </mat-selection-list>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        <mat-icon>close</mat-icon>
        Cancelar
      </button>
      <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="!selectedDiaId">
        <mat-icon>check</mat-icon>
        Confirmar
      </button>
    </div>
  `,
  styles: [
    `
    .dia-row { display: flex; align-items: center; gap: 12px; }
    .dia-num { width: 64px; font-weight: 600; }
    .dia-info { display: flex; flex-direction: column; }
    .dia-data { font-size: 12px; color: #666; }
    .dia-rota { font-size: 13px; }
    `
  ]
})
export class SelectDiaDialogComponent {
  selectedDiaId: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<SelectDiaDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public data: SelectDiaDialogData
  ) {}

  onSelect(dia: DiaViagem): void {
    this.selectedDiaId = dia.id || null;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    this.dialogRef.close(this.selectedDiaId);
  }
}
