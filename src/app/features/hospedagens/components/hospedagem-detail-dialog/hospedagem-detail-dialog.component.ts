import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Hospedagem } from '../../../../models';

export interface HospedagemDetailDialogData {
  hospedagem: Hospedagem;
  diaLabel: string;
}

@Component({
  selector: 'app-hospedagem-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  template: `
    <h5 mat-dialog-title class="title">
      <mat-icon class="tipo-icon">{{ getIconeHospedagem(data.hospedagem.tipo) }}</mat-icon>
      {{ data.hospedagem.nome }}
    </h5>

    <div mat-dialog-content class="content">
      <div class="subinfo">
        <span class="dia">{{ data.diaLabel }}</span>
        <span class="sep">•</span>
        <span class="tipo">{{ getTipoHospedagemTexto(data.hospedagem.tipo) }}</span>
      </div>

      <div class="grid">
        <div class="grid-item">
          <div class="section-title"><mat-icon>event</mat-icon> Período</div>
          <div class="row">
            <div><strong>Check-in:</strong> {{ data.hospedagem.dataCheckIn | date:'dd/MM/yyyy' }} <span *ngIf="data.hospedagem.horaCheckIn">às {{ data.hospedagem.horaCheckIn }}</span></div>
          </div>
          <div class="row">
            <div><strong>Check-out:</strong> {{ data.hospedagem.dataCheckOut | date:'dd/MM/yyyy' }} <span *ngIf="data.hospedagem.horaCheckOut">às {{ data.hospedagem.horaCheckOut }}</span></div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.valorDiaria">
          <div class="section-title"><mat-icon>attach_money</mat-icon> Valores</div>
          <div class="row">
            <div><strong>Diária:</strong> {{ data.hospedagem.valorDiaria | currency:'BRL':'symbol':'1.2-2':'pt' }}</div>
          </div>
          <div class="row" *ngIf="data.hospedagem.valorTotal">
            <div><strong>Total:</strong> {{ data.hospedagem.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt' }}</div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.endereco">
          <div class="section-title"><mat-icon>place</mat-icon> Endereço</div>
          <div>{{ data.hospedagem.endereco }}</div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.comodidades?.length">
          <div class="section-title"><mat-icon>checklist</mat-icon> Comodidades</div>
          <div class="chips">
            <mat-chip *ngFor="let c of data.hospedagem.comodidades">{{ c }}</mat-chip>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.avaliacao">
          <div class="section-title"><mat-icon>star_rate</mat-icon> Avaliação</div>
          <mat-chip color="accent">{{ data.hospedagem.avaliacao }} / 5</mat-chip>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.observacoes">
          <div class="section-title"><mat-icon>notes</mat-icon> Observações</div>
          <div class="obs">{{ data.hospedagem.observacoes }}</div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.fotos?.length">
          <div class="section-title"><mat-icon>photo_camera</mat-icon> Fotos</div>
          <div class="fotos">
            <img *ngFor="let f of data.hospedagem.fotos" [src]="f" alt="Foto da hospedagem" />
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
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    `
  ]
})
export class HospedagemDetailDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<HospedagemDetailDialogComponent, void>,
    @Inject(MAT_DIALOG_DATA) public data: HospedagemDetailDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  getIconeHospedagem(tipo: string): string {
    const icons: { [key: string]: string } = {
      'hotel': 'hotel',
      'pousada': 'house',
      'hostel': 'group',
      'camping': 'nature',
      'casa-temporada': 'home',
      'apartamento': 'apartment',
      'outros': 'business'
    };
    return icons[tipo] || 'hotel';
  }

  getTipoHospedagemTexto(tipo: string): string {
    const labels: { [key: string]: string } = {
      'hotel': 'Hotel',
      'pousada': 'Pousada',
      'hostel': 'Hostel',
      'camping': 'Camping',
      'casa-temporada': 'Casa de Temporada',
      'apartamento': 'Apartamento',
      'outros': 'Outros'
    };
    return labels[tipo] || tipo;
  }
}
