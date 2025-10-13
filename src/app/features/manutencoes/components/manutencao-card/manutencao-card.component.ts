import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { Manutencao } from '../../../../models/manutencao.interface';
import { TipoManutencao } from '../../../../models/enums';

/**
 * Componente de card para exibir manutenção
 */
@Component({
    selector: 'app-manutencao-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatMenuModule,
        MatDividerModule
    ],
    templateUrl: './manutencao-card.component.html',
    styleUrls: ['./manutencao-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManutencaoCardComponent {
    @Input() manutencao!: Manutencao;
    @Input() podeEditar = true;

    @Output() visualizar = new EventEmitter<Manutencao>();
    @Output() editar = new EventEmitter<Manutencao>();
    @Output() excluir = new EventEmitter<Manutencao>();

    /**
     * Retorna ícone para tipo de manutenção
     */
    getIconeTipo(tipo: TipoManutencao): string {
        const icones = {
            [TipoManutencao.PREVENTIVA]: 'schedule',
            [TipoManutencao.CORRETIVA]: 'build',
            [TipoManutencao.EMERGENCIAL]: 'warning'
        };
        return icones[tipo] || 'build';
    }

    /**
     * Retorna cor para tipo de manutenção
     */
    getCorTipo(tipo: TipoManutencao): string {
        const cores = {
            [TipoManutencao.PREVENTIVA]: 'primary',
            [TipoManutencao.CORRETIVA]: 'accent',
            [TipoManutencao.EMERGENCIAL]: 'warn'
        };
        return cores[tipo] || 'primary';
    }

    /**
     * Retorna label para tipo de manutenção
     */
    getLabelTipo(tipo: TipoManutencao): string {
        const labels = {
            [TipoManutencao.PREVENTIVA]: 'Preventiva',
            [TipoManutencao.CORRETIVA]: 'Corretiva',
            [TipoManutencao.EMERGENCIAL]: 'Emergencial'
        };
        return labels[tipo] || tipo;
    }

    /**
     * Formata valor monetário
     */
    formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    /**
     * Formata data
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    /**
     * Emite evento de visualização
     */
    onVisualizar(): void {
        this.visualizar.emit(this.manutencao);
    }

    /**
     * Emite evento de edição
     */
    onEditar(): void {
        this.editar.emit(this.manutencao);
    }

    /**
     * Emite evento de exclusão
     */
    onExcluir(): void {
        this.excluir.emit(this.manutencao);
    }
}
