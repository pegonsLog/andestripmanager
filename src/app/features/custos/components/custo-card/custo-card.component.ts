import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { Custo, CategoriaCusto } from '../../../../models';

@Component({
  selector: 'app-custo-card',
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
  templateUrl: './custo-card.component.html',
  styleUrls: ['./custo-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustoCardComponent {
  @Input() custo!: Custo;
  @Input() showActions = true;

  @Output() editar = new EventEmitter<Custo>();
  @Output() excluir = new EventEmitter<Custo>();

  onEditar(): void {
    this.editar.emit(this.custo);
  }

  onExcluir(): void {
    this.excluir.emit(this.custo);
  }

  getCategoriaTexto(categoria: CategoriaCusto): string {
    const labels: Record<CategoriaCusto, string> = {
      [CategoriaCusto.COMBUSTIVEL]: 'Combustível',
      [CategoriaCusto.ALIMENTACAO]: 'Alimentação',
      [CategoriaCusto.HOSPEDAGEM]: 'Hospedagem',
      [CategoriaCusto.MANUTENCAO]: 'Manutenção',
      [CategoriaCusto.PEDAGIO]: 'Pedágio',
      [CategoriaCusto.SEGURO]: 'Seguro',
      [CategoriaCusto.OUTROS]: 'Outros'
    };
    return labels[categoria] || categoria;
  }

  getIconeCategoria(categoria: CategoriaCusto): string {
    const icons: Record<CategoriaCusto, string> = {
      [CategoriaCusto.COMBUSTIVEL]: 'local_gas_station',
      [CategoriaCusto.ALIMENTACAO]: 'restaurant',
      [CategoriaCusto.HOSPEDAGEM]: 'hotel',
      [CategoriaCusto.MANUTENCAO]: 'build',
      [CategoriaCusto.PEDAGIO]: 'toll',
      [CategoriaCusto.SEGURO]: 'security',
      [CategoriaCusto.OUTROS]: 'more_horiz'
    };
    return icons[categoria] || 'attach_money';
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getTipoTexto(tipo: 'planejado' | 'real'): string {
    return tipo === 'real' ? 'Real' : 'Planejado';
  }

  getTipoColor(tipo: 'planejado' | 'real'): string {
    return tipo === 'real' ? 'accent' : 'primary';
  }
}
