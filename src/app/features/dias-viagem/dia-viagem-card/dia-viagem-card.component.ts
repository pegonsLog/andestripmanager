import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

import { DiaViagem } from '../../../models';

/**
 * Componente de card para exibir informações de um dia de viagem
 */
@Component({
    selector: 'app-dia-viagem-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTooltipModule,
        MatMenuModule,
        DatePipe
    ],
    templateUrl: './dia-viagem-card.component.html',
    styleUrls: ['./dia-viagem-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiaViagemCardComponent {
    @Input() dia!: DiaViagem;

    @Output() editar = new EventEmitter<DiaViagem>();
    @Output() visualizar = new EventEmitter<DiaViagem>();
    @Output() remover = new EventEmitter<DiaViagem>();

    /**
     * Emite evento para editar o dia
     */
    onEditar(): void {
        this.editar.emit(this.dia);
    }

    /**
     * Emite evento para visualizar detalhes do dia
     */
    onVisualizar(): void {
        this.visualizar.emit(this.dia);
    }

    /**
     * Emite evento para remover o dia
     */
    onRemover(): void {
        this.remover.emit(this.dia);
    }

    /**
     * Formata data para exibição
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        });
    }

    /**
     * Formata distância
     */
    formatarDistancia(km: number): string {
        return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
    }

    /**
     * Formata tempo em minutos para horas e minutos
     */
    formatarTempo(minutos: number): string {
        if (!minutos) return '';

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        if (horas === 0) return `${mins}min`;
        if (mins === 0) return `${horas}h`;
        return `${horas}h ${mins}min`;
    }

    /**
     * Retorna ícone baseado na condição climática
     */
    getClimaIcon(condicao?: string): string {
        if (!condicao) return 'wb_sunny';

        switch (condicao.toLowerCase()) {
            case 'ensolarado':
            case 'sol':
                return 'wb_sunny';
            case 'nublado':
            case 'parcialmente-nublado':
                return 'wb_cloudy';
            case 'chuva':
            case 'chuvoso':
                return 'umbrella';
            case 'tempestade':
                return 'thunderstorm';
            case 'neve':
                return 'ac_unit';
            default:
                return 'wb_sunny';
        }
    }

    /**
     * Retorna cor do chip baseado na condição climática
     */
    getClimaColor(condicao?: string): string {
        if (!condicao) return '';

        switch (condicao.toLowerCase()) {
            case 'ensolarado':
            case 'sol':
                return 'primary';
            case 'nublado':
            case 'parcialmente-nublado':
                return '';
            case 'chuva':
            case 'chuvoso':
            case 'tempestade':
                return 'accent';
            default:
                return '';
        }
    }

    /**
     * Verifica se o dia foi completado (tem dados reais)
     */
    isDiaCompleto(): boolean {
        return !!(this.dia.distanciaPercorrida || this.dia.horaPartidaReal || this.dia.horaChegadaReal);
    }

    /**
     * Calcula progresso do dia (0-100%)
     */
    getProgresso(): number {
        if (!this.dia.distanciaPercorrida || !this.dia.distanciaPlanejada) return 0;
        return Math.min(100, (this.dia.distanciaPercorrida / this.dia.distanciaPlanejada) * 100);
    }
}