import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { Custo, CategoriaCusto, ResumoCustos, RelatorioCustos } from '../models';

@Injectable({
    providedIn: 'root'
})
export class CustosService extends BaseFirestoreService<Custo> {
    protected collectionName = 'custos';

    constructor(firestore: any) {
        super(firestore);
    }

    /**
     * Lista custos de uma viagem
     */
    listarCustosViagem(viagemId: string): Observable<Custo[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            orderBy('data', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista custos por categoria
     */
    listarPorCategoria(viagemId: string, categoria: CategoriaCusto): Observable<Custo[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            where('categoria', '==', categoria),
            orderBy('data', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista custos por tipo (planejado/real)
     */
    listarPorTipo(viagemId: string, tipo: 'planejado' | 'real'): Observable<Custo[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            where('tipo', '==', tipo),
            orderBy('data', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Cria novo custo
     */
    async criarCusto(dadosCusto: Omit<Custo, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        return this.novo(dadosCusto);
    }

    /**
     * Calcula total de custos por categoria
     */
    calcularTotalPorCategoria(viagemId: string): Observable<ResumoCustos[]> {
        return this.listarCustosViagem(viagemId).pipe(
            map(custos => {
                const resumoPorCategoria = new Map<CategoriaCusto, ResumoCustos>();
                let totalGeral = 0;

                // Agrupar por categoria
                custos.forEach(custo => {
                    const categoria = custo.categoria;
                    const valor = custo.valor;
                    totalGeral += valor;

                    if (resumoPorCategoria.has(categoria)) {
                        const resumo = resumoPorCategoria.get(categoria)!;
                        resumo.valorTotal += valor;
                        resumo.quantidade += 1;
                    } else {
                        resumoPorCategoria.set(categoria, {
                            categoria,
                            valorTotal: valor,
                            quantidade: 1,
                            percentual: 0,
                            valorMedio: 0
                        });
                    }
                });

                // Calcular percentuais e médias
                const resultado: ResumoCustos[] = [];
                resumoPorCategoria.forEach(resumo => {
                    resumo.percentual = totalGeral > 0 ? (resumo.valorTotal / totalGeral) * 100 : 0;
                    resumo.valorMedio = resumo.quantidade > 0 ? resumo.valorTotal / resumo.quantidade : 0;
                    resultado.push(resumo);
                });

                return resultado.sort((a, b) => b.valorTotal - a.valorTotal);
            })
        );
    }

    /**
     * Gera relatório completo de custos
     */
    gerarRelatorio(viagemId: string): Observable<RelatorioCustos> {
        return this.listarCustosViagem(viagemId).pipe(
            map(custos => {
                const custosReais = custos.filter(c => c.tipo === 'real');
                const custosPlanejados = custos.filter(c => c.tipo === 'planejado');

                const totalReal = custosReais.reduce((sum, c) => sum + c.valor, 0);
                const totalPlanejado = custosPlanejados.reduce((sum, c) => sum + c.valor, 0);
                const diferenca = totalReal - totalPlanejado;
                const percentualVariacao = totalPlanejado > 0 ? (diferenca / totalPlanejado) * 100 : 0;

                // Calcular resumo por categoria
                const resumoPorCategoria = this.calcularResumoPorCategoria(custosReais);

                // Calcular custo médio por dia (assumindo que temos as datas)
                const diasUnicos = new Set(custosReais.map(c => c.data)).size;
                const custoMedioPorDia = diasUnicos > 0 ? totalReal / diasUnicos : 0;

                return {
                    viagemId,
                    totalPlanejado,
                    totalReal,
                    diferenca,
                    percentualVariacao,
                    resumoPorCategoria,
                    custoMedioPorDia,
                    dataGeracao: new Date().toISOString()
                };
            })
        );
    }

    /**
     * Calcula resumo por categoria para um array de custos
     */
    private calcularResumoPorCategoria(custos: Custo[]): ResumoCustos[] {
        const resumoPorCategoria = new Map<CategoriaCusto, ResumoCustos>();
        const totalGeral = custos.reduce((sum, c) => sum + c.valor, 0);

        custos.forEach(custo => {
            const categoria = custo.categoria;
            const valor = custo.valor;

            if (resumoPorCategoria.has(categoria)) {
                const resumo = resumoPorCategoria.get(categoria)!;
                resumo.valorTotal += valor;
                resumo.quantidade += 1;
            } else {
                resumoPorCategoria.set(categoria, {
                    categoria,
                    valorTotal: valor,
                    quantidade: 1,
                    percentual: 0,
                    valorMedio: 0
                });
            }
        });

        const resultado: ResumoCustos[] = [];
        resumoPorCategoria.forEach(resumo => {
            resumo.percentual = totalGeral > 0 ? (resumo.valorTotal / totalGeral) * 100 : 0;
            resumo.valorMedio = resumo.quantidade > 0 ? resumo.valorTotal / resumo.quantidade : 0;
            resultado.push(resumo);
        });

        return resultado.sort((a, b) => b.valorTotal - a.valorTotal);
    }
}