import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AlertaClimatico } from '../../../../models/clima.interface';

@Component({
    selector: 'app-alertas-clima',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatChipsModule,
        MatButtonModule,
        MatExpansionModule,
        MatTooltipModule
    ],
    templateUrl: './alertas-clima.component.html',
    styleUrls: ['./alertas-clima.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertasClimaComponent {
    @Input() alertas: AlertaClimatico[] = [];
    @Input() showTitle = true;
    @Input() expandable = false;

    /**
     * Obtém o ícone do alerta baseado no tipo
     */
    obterIconeAlerta(tipo: string): string {
        const icones: { [key: string]: string } = {
            'chuva': 'umbrella',
            'tempestade': 'thunderstorm',
            'vento': 'air',
            'temperatura': 'thermostat',
            'visibilidade': 'visibility_off'
        };

        return icones[tipo] || 'warning';
    }

    /**
     * Obtém a cor do alerta baseada na severidade
     */
    obterCorAlerta(severidade: 'baixa' | 'media' | 'alta'): string {
        const cores = {
            'baixa': '#4CAF50',    // Verde
            'media': '#FF9800',    // Laranja
            'alta': '#F44336'      // Vermelho
        };

        return cores[severidade];
    }

    /**
     * Obtém a classe CSS baseada na severidade
     */
    obterClasseSeveridade(severidade: 'baixa' | 'media' | 'alta'): string {
        return `alerta-${severidade}`;
    }

    /**
     * Obtém o texto da severidade
     */
    obterTextoSeveridade(severidade: 'baixa' | 'media' | 'alta'): string {
        const textos = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta'
        };

        return textos[severidade];
    }

    /**
     * Formata a data do alerta
     */
    formatarDataAlerta(dataISO: string): string {
        const data = new Date(dataISO);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Verifica se o alerta ainda está ativo
     */
    alertaAtivo(alerta: AlertaClimatico): boolean {
        const agora = new Date();
        const inicio = new Date(alerta.inicio);
        const fim = alerta.fim ? new Date(alerta.fim) : null;

        return agora >= inicio && (!fim || agora <= fim);
    }

    /**
     * Obtém alertas por severidade
     */
    obterAlertasPorSeveridade(severidade: 'baixa' | 'media' | 'alta'): AlertaClimatico[] {
        return this.alertas.filter(alerta => alerta.severidade === severidade);
    }

    /**
     * Verifica se há alertas de alta severidade
     */
    temAlertasAltos(): boolean {
        return this.alertas.some(alerta => alerta.severidade === 'alta');
    }

    /**
     * Verifica se há alertas ativos
     */
    temAlertasAtivos(): boolean {
        return this.alertas.some(alerta => this.alertaAtivo(alerta));
    }

    /**
     * Obtém o número total de alertas ativos
     */
    contarAlertasAtivos(): number {
        return this.alertas.filter(alerta => this.alertaAtivo(alerta)).length;
    }

    /**
     * Obtém a mensagem de resumo dos alertas
     */
    obterResumoAlertas(): string {
        const total = this.alertas.length;
        const ativos = this.contarAlertasAtivos();
        const altos = this.obterAlertasPorSeveridade('alta').length;

        if (total === 0) {
            return 'Nenhum alerta climático';
        }

        if (altos > 0) {
            return `${altos} alerta${altos > 1 ? 's' : ''} de alta severidade`;
        }

        if (ativos > 0) {
            return `${ativos} alerta${ativos > 1 ? 's' : ''} ativo${ativos > 1 ? 's' : ''}`;
        }

        return `${total} alerta${total > 1 ? 's' : ''} climático${total > 1 ? 's' : ''}`;
    }
}