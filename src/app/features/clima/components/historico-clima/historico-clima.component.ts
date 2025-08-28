import { Component, Input, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { Clima } from '../../../../models/clima.interface';
import { CondicaoClimatica } from '../../../../models/enums';
import { ClimaService } from '../../../../services/clima.service';

interface HistoricoItem {
    data: string;
    cidade: string;
    previsao?: {
        temperaturaMin: number;
        temperaturaMax: number;
        condicao: CondicaoClimatica;
        chanceChuva: number;
    };
    observado?: {
        temperatura: number;
        condicao: CondicaoClimatica;
        choveu: boolean;
    };
    precisao?: number; // Precisão da previsão vs observado
}

@Component({
    selector: 'app-historico-clima',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatTooltipModule,
        MatChipsModule
    ],
    templateUrl: './historico-clima.component.html',
    styleUrls: ['./historico-clima.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoricoClimaComponent implements OnInit {
    @Input() diasViagemIds: string[] = [];
    @Input() showTitle = true;
    @Input() maxItems = 10;

    historico: HistoricoItem[] = [];
    displayedColumns: string[] = ['data', 'cidade', 'previsao', 'observado', 'precisao'];
    isLoading = false;

    constructor(
        private climaService: ClimaService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.carregarHistorico();
    }

    /**
     * Carrega o histórico de clima
     */
    private async carregarHistorico(): Promise<void> {
        if (this.diasViagemIds.length === 0) {
            return;
        }

        this.isLoading = true;
        this.cdr.detectChanges();

        try {
            const climas = await this.climaService.recuperarPorViagem(this.diasViagemIds).toPromise();

            if (climas) {
                this.historico = this.processarHistorico(climas);
                this.historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

                if (this.maxItems > 0) {
                    this.historico = this.historico.slice(0, this.maxItems);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar histórico de clima:', error);
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Processa os dados de clima para o histórico
     */
    private processarHistorico(climas: Clima[]): HistoricoItem[] {
        return climas.map(clima => {
            const item: HistoricoItem = {
                data: clima.data,
                cidade: clima.cidade
            };

            if (clima.previsao) {
                item.previsao = {
                    temperaturaMin: clima.previsao.temperaturaMin,
                    temperaturaMax: clima.previsao.temperaturaMax,
                    condicao: clima.previsao.condicao,
                    chanceChuva: clima.previsao.chanceChuva
                };
            }

            if (clima.observado) {
                item.observado = {
                    temperatura: clima.observado.temperatura,
                    condicao: clima.observado.condicao,
                    choveu: clima.observado.choveu
                };
            }

            // Calcular precisão se temos previsão e observado
            if (item.previsao && item.observado) {
                item.precisao = this.calcularPrecisao(item.previsao, item.observado);
            }

            return item;
        });
    }

    /**
     * Calcula a precisão da previsão comparada com o observado
     */
    private calcularPrecisao(previsao: any, observado: any): number {
        let pontos = 0;
        let total = 0;

        // Precisão da temperatura (±3°C = 100%)
        const tempMedia = (previsao.temperaturaMin + previsao.temperaturaMax) / 2;
        const diferencaTemp = Math.abs(tempMedia - observado.temperatura);
        const precisaoTemp = Math.max(0, 100 - (diferencaTemp * 33.33)); // 3°C = 100%
        pontos += precisaoTemp;
        total += 100;

        // Precisão da condição climática
        const precisaoCondicao = previsao.condicao === observado.condicao ? 100 : 0;
        pontos += precisaoCondicao;
        total += 100;

        // Precisão da chuva
        const preveuChuva = previsao.chanceChuva > 50;
        const precisaoChuva = preveuChuva === observado.choveu ? 100 : 0;
        pontos += precisaoChuva;
        total += 100;

        return Math.round(pontos / total * 100) / 100;
    }

    /**
     * Obtém o ícone da condição climática
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
            [CondicaoClimatica.ENSOLARADO]: '#FFA726',
            [CondicaoClimatica.NUBLADO]: '#78909C',
            [CondicaoClimatica.CHUVOSO]: '#42A5F5',
            [CondicaoClimatica.TEMPESTADE]: '#5C6BC0',
            [CondicaoClimatica.NEBLINA]: '#90A4AE',
            [CondicaoClimatica.VENTO_FORTE]: '#66BB6A'
        };

        return cores[condicao] || '#757575';
    }

    /**
     * Formata a temperatura
     */
    formatarTemperatura(temp: number): string {
        return `${temp}°C`;
    }

    /**
     * Formata o range de temperatura
     */
    formatarRangeTemperatura(min: number, max: number): string {
        return `${min}°C - ${max}°C`;
    }

    /**
     * Formata a data
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Obtém a cor da precisão
     */
    obterCorPrecisao(precisao: number): string {
        if (precisao >= 80) return '#4CAF50'; // Verde
        if (precisao >= 60) return '#FF9800'; // Laranja
        return '#F44336'; // Vermelho
    }

    /**
     * Obtém o texto da precisão
     */
    obterTextoPrecisao(precisao: number): string {
        if (precisao >= 80) return 'Excelente';
        if (precisao >= 60) return 'Boa';
        if (precisao >= 40) return 'Regular';
        return 'Baixa';
    }

    /**
     * Verifica se tem dados de previsão
     */
    temPrevisao(item: HistoricoItem): boolean {
        return !!item.previsao;
    }

    /**
     * Verifica se tem dados observados
     */
    temObservado(item: HistoricoItem): boolean {
        return !!item.observado;
    }

    /**
     * Obtém estatísticas do histórico
     */
    obterEstatisticas(): any {
        if (this.historico.length === 0) {
            return null;
        }

        const comPrevisao = this.historico.filter(item => this.temPrevisao(item)).length;
        const comObservado = this.historico.filter(item => this.temObservado(item)).length;
        const comPrecisao = this.historico.filter(item => item.precisao !== undefined);

        const precisaoMedia = comPrecisao.length > 0
            ? comPrecisao.reduce((acc, item) => acc + (item.precisao || 0), 0) / comPrecisao.length
            : 0;

        return {
            total: this.historico.length,
            comPrevisao,
            comObservado,
            precisaoMedia: Math.round(precisaoMedia)
        };
    }

    /**
     * Atualiza o histórico
     */
    atualizarHistorico(): void {
        this.carregarHistorico();
    }
}