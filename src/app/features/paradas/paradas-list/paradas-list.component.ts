import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';

// Components
import { ParadasMapComponent } from '../paradas-map/paradas-map.component';

// Models
import { Parada, TipoParada } from '../../../models';

@Component({
    selector: 'app-paradas-list',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatMenuModule,
        MatTooltipModule,
        MatDividerModule,
        MatTabsModule,
        ParadasMapComponent
    ],
    templateUrl: './paradas-list.component.html',
    styleUrls: ['./paradas-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParadasListComponent {
    @Input() paradas: Parada[] = [];
    @Input() showMap: boolean = true;
    @Input() showAddButton: boolean = true;
    @Input() loading: boolean = false;

    @Output() paradaSelected = new EventEmitter<Parada>();
    @Output() editarParada = new EventEmitter<Parada>();
    @Output() excluirParada = new EventEmitter<Parada>();
    @Output() adicionarParada = new EventEmitter<void>();
    @Output() centerOnMap = new EventEmitter<Parada>();

    // Enums para template
    TipoParada = TipoParada;

    // Configurações de tipos
    tipoConfigs = {
        [TipoParada.ABASTECIMENTO]: {
            icon: 'local_gas_station',
            color: 'warn',
            label: 'Abastecimento'
        },
        [TipoParada.REFEICAO]: {
            icon: 'restaurant',
            color: 'primary',
            label: 'Refeição'
        },
        [TipoParada.PONTO_INTERESSE]: {
            icon: 'place',
            color: 'accent',
            label: 'Ponto de Interesse'
        },
        [TipoParada.DESCANSO]: {
            icon: 'hotel',
            color: 'primary',
            label: 'Descanso'
        },
        [TipoParada.MANUTENCAO]: {
            icon: 'build',
            color: 'warn',
            label: 'Manutenção'
        },
        [TipoParada.HOSPEDAGEM]: {
            icon: 'bed',
            color: 'accent',
            label: 'Hospedagem'
        }
    };

    /**
     * Manipula seleção de parada
     */
    onParadaClick(parada: Parada): void {
        this.paradaSelected.emit(parada);
    }

    /**
     * Manipula edição de parada
     */
    onEditarParada(parada: Parada, event: Event): void {
        event.stopPropagation();
        this.editarParada.emit(parada);
    }

    /**
     * Manipula exclusão de parada
     */
    onExcluirParada(parada: Parada, event: Event): void {
        event.stopPropagation();
        this.excluirParada.emit(parada);
    }

    /**
     * Manipula centralização no mapa
     */
    onCenterOnMap(parada: Parada, event: Event): void {
        event.stopPropagation();
        this.centerOnMap.emit(parada);
    }

    /**
     * Manipula adição de nova parada
     */
    onAdicionarParada(): void {
        this.adicionarParada.emit();
    }

    /**
     * Manipula seleção de parada no mapa
     */
    onMapParadaSelected(parada: Parada): void {
        this.paradaSelected.emit(parada);
    }

    /**
     * Obtém configuração do tipo de parada
     */
    getTipoConfig(tipo: TipoParada) {
        return this.tipoConfigs[tipo];
    }

    /**
     * Formata horário
     */
    formatarHorario(hora: string | undefined): string {
        if (!hora) return '--:--';
        return hora;
    }

    /**
     * Formata valor monetário
     */
    formatarValor(valor: number | undefined): string {
        if (!valor) return 'R$ --,--';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    /**
     * Obtém paradas ordenadas cronologicamente
     */
    getParadasOrdenadas(): Parada[] {
        return [...this.paradas].sort((a, b) => {
            if (!a.horaChegada && !b.horaChegada) return 0;
            if (!a.horaChegada) return 1;
            if (!b.horaChegada) return -1;
            return a.horaChegada.localeCompare(b.horaChegada);
        });
    }

    /**
     * Verifica se parada tem coordenadas
     */
    temCoordenadas(parada: Parada): boolean {
        return !!(parada.coordenadas && parada.coordenadas.length === 2);
    }

    /**
     * Obtém resumo da parada baseado no tipo
     */
    getResumoParada(parada: Parada): string {
        switch (parada.tipo) {
            case TipoParada.ABASTECIMENTO:
                const dados = parada.dadosEspecificos as any;
                if (dados?.quantidade && dados?.tipoCombustivel) {
                    return `${dados.quantidade}L de ${dados.tipoCombustivel}`;
                }
                return 'Abastecimento';

            case TipoParada.REFEICAO:
                const dadosRef = parada.dadosEspecificos as any;
                if (dadosRef?.tipoRefeicao) {
                    return dadosRef.tipoRefeicao;
                }
                return 'Refeição';

            case TipoParada.PONTO_INTERESSE:
                const dadosPonto = parada.dadosEspecificos as any;
                if (dadosPonto?.categoria) {
                    return dadosPonto.categoria;
                }
                return 'Ponto de Interesse';

            default:
                return this.getTipoConfig(parada.tipo).label;
        }
    }

    /**
     * TrackBy function para performance
     */
    trackByParadaId(index: number, parada: Parada): string {
        return parada.id || index.toString();
    }
}