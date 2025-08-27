import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

// Models
import { Viagem, StatusViagem } from '../../../models';

@Component({
    selector: 'app-viagem-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatMenuModule,
        MatTooltipModule
    ],
    templateUrl: './viagem-card.component.html',
    styleUrls: ['./viagem-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViagemCardComponent {
    @Input() viagem!: Viagem;
    @Input() showActions: boolean = true;
    @Input() compact: boolean = false;

    @Output() visualizar = new EventEmitter<string>();
    @Output() editar = new EventEmitter<string>();
    @Output() excluir = new EventEmitter<string>();
    @Output() duplicar = new EventEmitter<string>();

    // Enums para template
    readonly StatusViagem = StatusViagem;

    /**
     * Emite evento para visualizar viagem
     */
    onVisualizar(): void {
        if (this.viagem.id) {
            this.visualizar.emit(this.viagem.id);
        }
    }

    /**
     * Emite evento para editar viagem
     */
    onEditar(event: Event): void {
        event.stopPropagation();
        if (this.viagem.id) {
            this.editar.emit(this.viagem.id);
        }
    }

    /**
     * Emite evento para excluir viagem
     */
    onExcluir(event: Event): void {
        event.stopPropagation();
        if (this.viagem.id) {
            this.excluir.emit(this.viagem.id);
        }
    }

    /**
     * Emite evento para duplicar viagem
     */
    onDuplicar(event: Event): void {
        event.stopPropagation();
        if (this.viagem.id) {
            this.duplicar.emit(this.viagem.id);
        }
    }

    /**
     * Retorna a cor do chip baseada no status
     */
    getCorStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'primary';
            case StatusViagem.EM_ANDAMENTO:
                return 'accent';
            case StatusViagem.FINALIZADA:
                return 'warn';
            default:
                return 'primary';
        }
    }

    /**
     * Retorna o texto do status em português
     */
    getTextoStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'Planejada';
            case StatusViagem.EM_ANDAMENTO:
                return 'Em Andamento';
            case StatusViagem.FINALIZADA:
                return 'Finalizada';
            default:
                return status;
        }
    }

    /**
     * Retorna o ícone do status
     */
    getIconeStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'schedule';
            case StatusViagem.EM_ANDAMENTO:
                return 'directions_bike';
            case StatusViagem.FINALIZADA:
                return 'check_circle';
            default:
                return 'help';
        }
    }

    /**
     * Formata data para exibição
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
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
     * Formata distância
     */
    formatarDistancia(distancia: number): string {
        return `${distancia.toLocaleString('pt-BR')} km`;
    }

    /**
     * Calcula duração da viagem em dias
     */
    calcularDuracao(): number {
        const inicio = new Date(this.viagem.dataInicio);
        const fim = new Date(this.viagem.dataFim);
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Verifica se a viagem está atrasada (apenas para planejadas)
     */
    isAtrasada(): boolean {
        if (this.viagem.status !== StatusViagem.PLANEJADA) {
            return false;
        }

        const hoje = new Date();
        const dataInicio = new Date(this.viagem.dataInicio);
        return dataInicio < hoje;
    }

    /**
     * Calcula dias restantes para início da viagem
     */
    diasRestantes(): number {
        const hoje = new Date();
        const dataInicio = new Date(this.viagem.dataInicio);
        const diffTime = dataInicio.getTime() - hoje.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}