import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { Parada, TipoParada } from '../../../models';

@Component({
  selector: 'app-parada-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './parada-card.component.html',
  styleUrls: ['./parada-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParadaCardComponent {
  @Input() parada!: Parada;
  @Input() diaLabel: string = '';
  @Input() showActions = true;

  @Output() editar = new EventEmitter<Parada>();
  @Output() excluir = new EventEmitter<Parada>();
  @Output() visualizar = new EventEmitter<Parada>();

  onEditar(): void {
    this.editar.emit(this.parada);
  }

  onExcluir(): void {
    this.excluir.emit(this.parada);
  }

  onVisualizar(): void {
    this.visualizar.emit(this.parada);
  }

  getTipoParadaLabel(tipo: TipoParada): string {
    const labels: Record<string, string> = {
      'abastecimento': 'Abastecimento',
      'refeicao': 'Refeição',
      'ponto-interesse': 'Ponto de Interesse',
      'descanso': 'Descanso',
      'manutencao': 'Manutenção',
      'hospedagem': 'Hospedagem'
    };
    return labels[tipo] || tipo;
  }

  getTipoIcon(tipo: TipoParada): string {
    const icons: Record<string, string> = {
      'abastecimento': 'local_gas_station',
      'refeicao': 'restaurant',
      'ponto-interesse': 'place',
      'descanso': 'hotel',
      'manutencao': 'build',
      'hospedagem': 'hotel'
    };
    return icons[tipo] || 'place';
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  temFotos(): boolean {
    return !!(this.parada.fotos && this.parada.fotos.length > 0);
  }

  getPrimeiraFoto(): string | undefined {
    return this.parada.fotos?.[0];
  }

  getQuantidadeFotos(): number {
    return this.parada.fotos?.length || 0;
  }

  getEstrelas(avaliacao?: number): number[] {
    const valor = avaliacao || 0;
    return Array(5).fill(0).map((_, i) => i < valor ? 1 : 0);
  }
}
