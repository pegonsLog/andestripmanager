import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Clima, PrevisaoTempo, ClimaObservado, AlertaClimatico } from '../../../../models/clima.interface';
import { CondicaoClimatica } from '../../../../models/enums';

@Component({
    selector: 'app-clima-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatChipsModule,
        MatTooltipModule
    ],
    templateUrl: './clima-card.component.html',
    styleUrls: ['./clima-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClimaCardComponent {
    @Input() clima?: Clima;
    @Input() previsao?: PrevisaoTempo;
    @Input() observado?: ClimaObservado;
    @Input() alertas: AlertaClimatico[] = [];
    @Input() showActions = true;
    @Input() compact = false;

    @Output() registrarObservado = new EventEmitter<void>();
    @Output() atualizarPrevisao = new EventEmitter<void>();

    // Expor enum para o template
    CondicaoClimatica = CondicaoClimatica;

    /**
     * Obtém o ícone correspondente à condição climática
     */
    obterIconeClima(condicao: CondicaoClimatica): string {
        const icones: { [key in CondicaoClimatica]: string } = {
            [CondicaoClimatica.ENSOLARADO]: 'wb_sunny',
            [CondicaoClimatica.NUBLADO]: 'cloud',
            [CondicaoClimatica.CHUVOSO]: 'umbrella',
            [CondicaoClimatica.TEMPESTADE]: 'thunderstorm',
            [CondicaoClimatica.NEBLINA]: 'foggy',
            [CondicaoClimatica.VENTO_FORTE]: 'air'
        };

        return icones[condicao] || 'help_outline';
    }

    /**
     * Obtém a cor do ícone baseada na condição
     */
    obterCorIcone(condicao: CondicaoClimatica): string {
        const cores: { [key in CondicaoClimatica]: string } = {
            [CondicaoClimatica.ENSOLARADO]: '#FFA726', // Laranja
            [CondicaoClimatica.NUBLADO]: '#78909C', // Cinza azulado
            [CondicaoClimatica.CHUVOSO]: '#42A5F5', // Azul
            [CondicaoClimatica.TEMPESTADE]: '#5C6BC0', // Roxo
            [CondicaoClimatica.NEBLINA]: '#90A4AE', // Cinza
            [CondicaoClimatica.VENTO_FORTE]: '#66BB6A' // Verde
        };

        return cores[condicao] || '#757575';
    }

    /**
     * Obtém a descrição da condição climática
     */
    obterDescricaoCondicao(condicao: CondicaoClimatica): string {
        const descricoes: { [key in CondicaoClimatica]: string } = {
            [CondicaoClimatica.ENSOLARADO]: 'Ensolarado',
            [CondicaoClimatica.NUBLADO]: 'Nublado',
            [CondicaoClimatica.CHUVOSO]: 'Chuvoso',
            [CondicaoClimatica.TEMPESTADE]: 'Tempestade',
            [CondicaoClimatica.NEBLINA]: 'Neblina',
            [CondicaoClimatica.VENTO_FORTE]: 'Vento Forte'
        };

        return descricoes[condicao] || 'Indefinido';
    }

    /**
     * Obtém a cor do chip de alerta baseada na severidade
     */
    obterCorAlerta(severidade: 'baixa' | 'media' | 'alta'): string {
        const cores = {
            'baixa': 'primary',
            'media': 'accent',
            'alta': 'warn'
        };

        return cores[severidade];
    }

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
     * Formata a temperatura com unidade
     */
    formatarTemperatura(temperatura: number): string {
        return `${temperatura}°C`;
    }

    /**
     * Formata a velocidade do vento
     */
    formatarVento(velocidade: number): string {
        return `${velocidade} km/h`;
    }

    /**
     * Formata a umidade
     */
    formatarUmidade(umidade: number): string {
        return `${umidade}%`;
    }

    /**
     * Formata a chance de chuva
     */
    formatarChanceChuva(chance: number): string {
        return `${chance}%`;
    }

    /**
     * Verifica se há alertas de alta severidade
     */
    temAlertasAltos(): boolean {
        return this.alertas.some(alerta => alerta.severidade === 'alta');
    }

    /**
     * Verifica se há dados de previsão
     */
    temPrevisao(): boolean {
        return !!(this.clima?.previsao || this.previsao);
    }

    /**
     * Verifica se há dados observados
     */
    temObservado(): boolean {
        return !!(this.clima?.observado || this.observado);
    }

    /**
     * Obtém os dados de previsão (do clima ou input direto)
     */
    obterPrevisao(): PrevisaoTempo | undefined {
        return this.clima?.previsao || this.previsao;
    }

    /**
     * Obtém os dados observados (do clima ou input direto)
     */
    obterObservado(): ClimaObservado | undefined {
        return this.clima?.observado || this.observado;
    }

    /**
     * Emite evento para registrar clima observado
     */
    onRegistrarObservado(): void {
        this.registrarObservado.emit();
    }

    /**
     * Emite evento para atualizar previsão
     */
    onAtualizarPrevisao(): void {
        this.atualizarPrevisao.emit();
    }
}