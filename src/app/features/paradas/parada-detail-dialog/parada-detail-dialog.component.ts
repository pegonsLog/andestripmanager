import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Parada } from '../../../models';

export interface ParadaDetailDialogData {
  parada: Parada;
  diaLabel: string;
}

@Component({
  selector: 'app-parada-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  template: `
    <h5 mat-dialog-title class="title">
      <mat-icon class="tipo-icon">{{ getIconeParada(data.parada.tipo) }}</mat-icon>
      {{ data.parada.nome }}
    </h5>

    <div mat-dialog-content class="content">
      <div class="subinfo">
        <span class="dia">{{ data.diaLabel }}</span>
        <span class="sep">•</span>
        <span class="tipo">{{ getTipoParadaTexto(data.parada.tipo) }}</span>
      </div>

      <div class="grid">
        <div class="grid-item" *ngIf="data.parada.horaChegada || data.parada.horaSaida">
          <div class="section-title"><mat-icon>schedule</mat-icon> Horários</div>
          <div class="row">
            <div><strong>Chegada:</strong> {{ data.parada.horaChegada || '-' }}</div>
            <div><strong>Saída:</strong> {{ data.parada.horaSaida || '-' }}</div>
          </div>
          <div class="row" *ngIf="data.parada.duracao">
            <div><strong>Duração:</strong> {{ data.parada.duracao }} min</div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.parada.endereco">
          <div class="section-title"><mat-icon>place</mat-icon> Local</div>
          <div>{{ data.parada.endereco }}</div>
        </div>

        <div class="grid-item" *ngIf="data.parada.custo">
          <div class="section-title"><mat-icon>attach_money</mat-icon> Custo</div>
          <div>{{ data.parada.custo | currency:'BRL':'symbol':'1.2-2':'pt' }}</div>
        </div>

        <div class="grid-item" *ngIf="data.parada.avaliacao">
          <div class="section-title"><mat-icon>star_rate</mat-icon> Avaliação</div>
          <div>
            <mat-chip color="accent">{{ data.parada.avaliacao }} / 5</mat-chip>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.parada.observacoes">
          <div class="section-title"><mat-icon>notes</mat-icon> Observações</div>
          <div class="obs">{{ data.parada.observacoes }}</div>
        </div>

        <div class="grid-item" *ngIf="data.parada.fotos?.length">
          <div class="section-title"><mat-icon>photo_camera</mat-icon> Fotos</div>
          <div class="fotos">
            <img *ngFor="let f of data.parada.fotos" [src]="f" alt="Foto da parada" />
          </div>
        </div>
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">
        <mat-icon>close</mat-icon>
        Fechar
      </button>
    </div>
  `,
  styles: [
    `
    .title { display: flex; align-items: center; gap: 8px; }
    .tipo-icon { vertical-align: middle; }
    .content { max-height: 80vh; overflow: auto; }
    .subinfo { color: #666; margin: 4px 0 12px; display: flex; align-items: center; gap: 6px; }
    .sep { opacity: .6; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .grid-item { background: #fafafa; border-radius: 6px; padding: 12px; }
    .section-title { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 6px; }
    .row { display: flex; gap: 16px; }
    .obs { white-space: pre-wrap; }
    .fotos { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
    .fotos img { width: 100%; height: 90px; object-fit: cover; border-radius: 4px; }
    @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    `
  ]
})
export class ParadaDetailDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ParadaDetailDialogComponent, void>,
    @Inject(MAT_DIALOG_DATA) public data: ParadaDetailDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  getIconeParada(tipo: string): string {
    const icones: { [key: string]: string } = {
      'abastecimento': 'local_gas_station',
      'refeicao': 'restaurant',
      'ponto-interesse': 'place',
      'descanso': 'hotel',
      'manutencao': 'build',
      'hospedagem': 'hotel'
    };
    return icones[tipo] || 'place';
  }

  getTipoParadaTexto(tipo: string): string {
    const textos: { [key: string]: string } = {
      'abastecimento': 'Abastecimento',
      'refeicao': 'Refeição',
      'ponto-interesse': 'Ponto de Interesse',
      'descanso': 'Descanso',
      'manutencao': 'Manutenção',
      'hospedagem': 'Hospedagem'
    };
    return textos[tipo] || tipo;
  }
}
