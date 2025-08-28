import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';

import { Custo, CategoriaCusto, ResumoCustos, RelatorioCustos } from '../../../../models';
import { CustosService } from '../../../../services/custos.service';

/**
 * Componente para listagem e visualização de custos
 * Exibe custos agrupados por categoria com totais automáticos
 */
@Component({
    selector: 'app-custos-list',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatExpansionModule,
        MatDividerModule,
        MatTooltipModule
    ],
    templateUrl: './custos-list.component.html',
    styleUrls: ['./custos-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustosListComponent implements OnInit, OnDestroy {
    @Input() viagemId!: string;
    @Input() mostrarRelatorio = true;
    @Input() mostrarGraficos = true;

    private custosService = inject(CustosService);
    private destroy$ = new Subject<void>();

    // Observables
    custos$ = new BehaviorSubject<Custo[]>([]);
    resumoPorCategoria$ = new BehaviorSubject<ResumoCustos[]>([]);
    relatorio$ = new BehaviorSubject<RelatorioCustos | null>(null);
    isLoading$ = new BehaviorSubject<boolean>(true);

    // Labels das categorias
    categoriasLabels = {
        [CategoriaCusto.COMBUSTIVEL]: 'Combustível',
        [CategoriaCusto.HOSPEDAGEM]: 'Hospedagem',
        [CategoriaCusto.ALIMENTACAO]: 'Alimentação',
        [CategoriaCusto.MANUTENCAO]: 'Manutenção',
        [CategoriaCusto.PEDAGIO]: 'Pedágio',
        [CategoriaCusto.SEGURO]: 'Seguro',
        [CategoriaCusto.OUTROS]: 'Outros'
    };

    // Ícones das categorias
    categoriasIcones = {
        [CategoriaCusto.COMBUSTIVEL]: 'local_gas_station',
        [CategoriaCusto.HOSPEDAGEM]: 'hotel',
        [CategoriaCusto.ALIMENTACAO]: 'restaurant',
        [CategoriaCusto.MANUTENCAO]: 'build',
        [CategoriaCusto.PEDAGIO]: 'toll',
        [CategoriaCusto.SEGURO]: 'security',
        [CategoriaCusto.OUTROS]: 'more_horiz'
    };

    // Cores das categorias para gráficos
    categoriaCores = {
        [CategoriaCusto.COMBUSTIVEL]: '#FF6B6B',
        [CategoriaCusto.HOSPEDAGEM]: '#4ECDC4',
        [CategoriaCusto.ALIMENTACAO]: '#45B7D1',
        [CategoriaCusto.MANUTENCAO]: '#FFA07A',
        [CategoriaCusto.PEDAGIO]: '#98D8C8',
        [CategoriaCusto.SEGURO]: '#F7DC6F',
        [CategoriaCusto.OUTROS]: '#BB8FCE'
    };

    ngOnInit(): void {
        this.carregarDados();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega todos os dados de custos
     */
    private carregarDados(): void {
        if (!this.viagemId) {
            console.error('viagemId é obrigatório');
            return;
        }

        this.isLoading$.next(true);

        // Carregar custos
        this.custosService.listarCustosViagem(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (custos) => {
                    this.custos$.next(custos);
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar custos:', error);
                    this.isLoading$.next(false);
                }
            });

        // Carregar resumo por categoria
        this.custosService.calcularTotalPorCategoria(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resumo) => {
                    this.resumoPorCategoria$.next(resumo);
                },
                error: (error) => {
                    console.error('Erro ao carregar resumo por categoria:', error);
                }
            });

        // Carregar relatório completo
        if (this.mostrarRelatorio) {
            this.custosService.gerarRelatorio(this.viagemId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (relatorio) => {
                        this.relatorio$.next(relatorio);
                    },
                    error: (error) => {
                        console.error('Erro ao gerar relatório:', error);
                    }
                });
        }
    }

    /**
     * Agrupa custos por categoria
     */
    agruparCustosPorCategoria(custos: Custo[]): Map<CategoriaCusto, Custo[]> {
        const grupos = new Map<CategoriaCusto, Custo[]>();

        custos.forEach(custo => {
            if (!grupos.has(custo.categoria)) {
                grupos.set(custo.categoria, []);
            }
            grupos.get(custo.categoria)!.push(custo);
        });

        return grupos;
    }

    /**
     * Calcula total geral dos custos
     */
    calcularTotalGeral(custos: Custo[]): number {
        return custos.reduce((total, custo) => total + custo.valor, 0);
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
     * Formata data para exibição
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    /**
     * Formata percentual
     */
    formatarPercentual(valor: number): string {
        return `${valor.toFixed(1)}%`;
    }

    /**
     * Obtém cor da categoria
     */
    obterCorCategoria(categoria: CategoriaCusto): string {
        return this.categoriaCores[categoria] || '#9E9E9E';
    }

    /**
     * Obtém ícone da categoria
     */
    obterIconeCategoria(categoria: CategoriaCusto): string {
        return this.categoriasIcones[categoria] || 'more_horiz';
    }

    /**
     * Obtém label da categoria
     */
    obterLabelCategoria(categoria: CategoriaCusto): string {
        return this.categoriasLabels[categoria] || categoria;
    }

    /**
     * Filtra custos por tipo
     */
    filtrarCustosPorTipo(custos: Custo[], tipo: 'planejado' | 'real'): Custo[] {
        return custos.filter(custo => custo.tipo === tipo);
    }

    /**
     * Verifica se há custos planejados
     */
    temCustosPlanejados(custos: Custo[]): boolean {
        return custos.some(custo => custo.tipo === 'planejado');
    }

    /**
     * Verifica se há custos reais
     */
    temCustosReais(custos: Custo[]): boolean {
        return custos.some(custo => custo.tipo === 'real');
    }

    /**
     * Obtém classe CSS para o tipo de custo
     */
    obterClasseTipoCusto(tipo: 'planejado' | 'real'): string {
        return tipo === 'planejado' ? 'custo-planejado' : 'custo-real';
    }

    /**
     * Obtém dados para gráfico de pizza
     */
    obterDadosGraficoPizza(resumo: ResumoCustos[]): any[] {
        return resumo.map(item => ({
            name: this.obterLabelCategoria(item.categoria),
            value: item.valorTotal,
            color: this.obterCorCategoria(item.categoria)
        }));
    }

    /**
     * Recarrega os dados
     */
    recarregar(): void {
        this.carregarDados();
    }

    /**
     * Trackby function para performance
     */
    trackByCusto(index: number, custo: Custo): string {
        return custo.id || index.toString();
    }

    /**
     * Trackby function para categorias
     */
    trackByCategoria(index: number, item: [CategoriaCusto, Custo[]]): CategoriaCusto {
        return item[0];
    }

    /**
     * Trackby function para resumo
     */
    trackByResumo(index: number, resumo: ResumoCustos): CategoriaCusto {
        return resumo.categoria;
    }
}