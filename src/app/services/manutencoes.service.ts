import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Manutencao, ItemManutencao, CategoriaManutencao } from '../models/manutencao.interface';
import { TipoManutencao } from '../models/enums';
import { BaseService } from '../core/services/base.service';

/**
 * Serviço para gerenciamento de manutenções da motocicleta
 */
@Injectable({
    providedIn: 'root'
})
export class ManutencoesService extends BaseService<Manutencao> {
    protected collectionName = 'manutencoes';

    constructor(protected override firestore: AngularFirestore) {
        super(firestore);
    }

    /**
     * Recupera todas as manutenções de um usuário
     * @param usuarioId ID do usuário
     * @returns Observable com lista de manutenções ordenadas por data
     */
    recuperarPorUsuario(usuarioId: string): Observable<Manutencao[]> {
        return this.firestore
            .collection<Manutencao>(this.collectionName, ref =>
                ref
                    .where('usuarioId', '==', usuarioId)
                    .orderBy('data', 'desc')
            )
            .valueChanges({ idField: 'id' });
    }

    /**
     * Recupera manutenções de uma viagem específica
     * @param viagemId ID da viagem
     * @returns Observable com lista de manutenções da viagem
     */
    recuperarPorViagem(viagemId: string): Observable<Manutencao[]> {
        return this.firestore
            .collection<Manutencao>(this.collectionName, ref =>
                ref
                    .where('viagemId', '==', viagemId)
                    .orderBy('data', 'desc')
            )
            .valueChanges({ idField: 'id' });
    }

    /**
     * Alias para compatibilidade com exportação
     * Lista manutenções por viagem
     */
    listarManutencoesPorViagem(viagemId: string): Observable<Manutencao[]> {
        return this.recuperarPorViagem(viagemId);
    }

    /**
     * Recupera manutenções por tipo
     * @param usuarioId ID do usuário
     * @param tipo Tipo de manutenção
     * @returns Observable com lista de manutenções filtradas
     */
    recuperarPorTipo(usuarioId: string, tipo: TipoManutencao): Observable<Manutencao[]> {
        return this.firestore
            .collection<Manutencao>(this.collectionName, ref =>
                ref
                    .where('usuarioId', '==', usuarioId)
                    .where('tipo', '==', tipo)
                    .orderBy('data', 'desc')
            )
            .valueChanges({ idField: 'id' });
    }

    /**
     * Recupera manutenções por período
     * @param usuarioId ID do usuário
     * @param dataInicio Data de início do período
     * @param dataFim Data de fim do período
     * @returns Observable com lista de manutenções do período
     */
    recuperarPorPeriodo(usuarioId: string, dataInicio: string, dataFim: string): Observable<Manutencao[]> {
        return this.firestore
            .collection<Manutencao>(this.collectionName, ref =>
                ref
                    .where('usuarioId', '==', usuarioId)
                    .where('data', '>=', dataInicio)
                    .where('data', '<=', dataFim)
                    .orderBy('data', 'desc')
            )
            .valueChanges({ idField: 'id' });
    }

    /**
     * Calcula o custo total de manutenções por período
     * @param usuarioId ID do usuário
     * @param dataInicio Data de início do período
     * @param dataFim Data de fim do período
     * @returns Observable com o valor total
     */
    calcularCustoTotalPorPeriodo(usuarioId: string, dataInicio: string, dataFim: string): Observable<number> {
        return this.recuperarPorPeriodo(usuarioId, dataInicio, dataFim).pipe(
            map(manutencoes => manutencoes.reduce((total, manutencao) => total + manutencao.custo, 0))
        );
    }

    /**
     * Recupera estatísticas de manutenções do usuário
     * @param usuarioId ID do usuário
     * @returns Observable com estatísticas
     */
    recuperarEstatisticas(usuarioId: string): Observable<{
        totalManutencoes: number;
        custoTotal: number;
        custoMedio: number;
        manutencoesPorTipo: { [key: string]: number };
        ultimaManutencao?: Manutencao;
    }> {
        return this.recuperarPorUsuario(usuarioId).pipe(
            map(manutencoes => {
                const totalManutencoes = manutencoes.length;
                const custoTotal = manutencoes.reduce((total, m) => total + m.custo, 0);
                const custoMedio = totalManutencoes > 0 ? custoTotal / totalManutencoes : 0;

                const manutencoesPorTipo = manutencoes.reduce((acc, m) => {
                    acc[m.tipo] = (acc[m.tipo] || 0) + 1;
                    return acc;
                }, {} as { [key: string]: number });

                return {
                    totalManutencoes,
                    custoTotal,
                    custoMedio,
                    manutencoesPorTipo,
                    ultimaManutencao: manutencoes[0] // Primeira da lista ordenada por data desc
                };
            })
        );
    }

    /**
     * Cria um checklist padrão de itens de manutenção preventiva
     * @returns Array com itens de checklist
     */
    criarChecklistPreventiva(): ItemManutencao[] {
        return [
            {
                nome: 'Troca de óleo do motor',
                categoria: CategoriaManutencao.MOTOR,
                custo: 0
            },
            {
                nome: 'Troca do filtro de óleo',
                categoria: CategoriaManutencao.MOTOR,
                custo: 0
            },
            {
                nome: 'Verificação dos freios',
                categoria: CategoriaManutencao.FREIOS,
                custo: 0
            },
            {
                nome: 'Calibragem dos pneus',
                categoria: CategoriaManutencao.PNEUS,
                custo: 0
            },
            {
                nome: 'Verificação da corrente',
                categoria: CategoriaManutencao.TRANSMISSAO,
                custo: 0
            },
            {
                nome: 'Limpeza do filtro de ar',
                categoria: CategoriaManutencao.MOTOR,
                custo: 0
            },
            {
                nome: 'Verificação das luzes',
                categoria: CategoriaManutencao.ELETRICA,
                custo: 0
            },
            {
                nome: 'Verificação da suspensão',
                categoria: CategoriaManutencao.SUSPENSAO,
                custo: 0
            }
        ];
    }

    /**
     * Cria um checklist básico para manutenção durante viagem
     * @returns Array com itens de checklist essenciais
     */
    criarChecklistViagem(): ItemManutencao[] {
        return [
            {
                nome: 'Verificação dos pneus',
                categoria: CategoriaManutencao.PNEUS,
                custo: 0
            },
            {
                nome: 'Verificação dos freios',
                categoria: CategoriaManutencao.FREIOS,
                custo: 0
            },
            {
                nome: 'Verificação da corrente',
                categoria: CategoriaManutencao.TRANSMISSAO,
                custo: 0
            },
            {
                nome: 'Verificação das luzes',
                categoria: CategoriaManutencao.ELETRICA,
                custo: 0
            },
            {
                nome: 'Verificação do óleo',
                categoria: CategoriaManutencao.MOTOR,
                custo: 0
            }
        ];
    }
}