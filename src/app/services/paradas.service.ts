import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Firestore, where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { Parada, TipoParada } from '../models';

@Injectable({
    providedIn: 'root'
})
export class ParadasService extends BaseFirestoreService<Parada> {
    protected collectionName = 'paradas';

    constructor(firestore: Firestore) {
        super(firestore);
    }

    /**
     * Lista paradas de um dia específico
     */
    listarParadasDia(diaViagemId: string): Observable<Parada[]> {
        const constraints: QueryConstraint[] = [
            where('diaViagemId', '==', diaViagemId),
            orderBy('horaChegada', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista paradas de uma viagem
     */
    listarParadasViagem(viagemId: string): Observable<Parada[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            orderBy('horaChegada', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista paradas por tipo
     */
    listarPorTipo(viagemId: string, tipo: TipoParada): Observable<Parada[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            where('tipo', '==', tipo),
            orderBy('horaChegada', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Cria nova parada
     */
    async criarParada(dadosParada: Omit<Parada, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        // Calcular duração se tiver hora de chegada e saída
        if (dadosParada.horaChegada && dadosParada.horaSaida) {
            const chegada = new Date(`2000-01-01T${dadosParada.horaChegada}`);
            const saida = new Date(`2000-01-01T${dadosParada.horaSaida}`);
            const duracao = (saida.getTime() - chegada.getTime()) / (1000 * 60); // em minutos

            return this.novo({
                ...dadosParada,
                duracao: duracao > 0 ? duracao : undefined
            });
        }

        return this.novo(dadosParada);
    }

    /**
     * Adiciona foto à parada
     */
    async adicionarFoto(id: string, fotoUrl: string): Promise<void> {
        const parada = await this.recuperarPorId(id).toPromise();
        if (parada) {
            const fotosAtuais = parada.fotos || [];
            await this.altera(id, { fotos: [...fotosAtuais, fotoUrl] });
        }
    }

    /**
     * Atualiza avaliação da parada
     */
    async atualizarAvaliacao(id: string, avaliacao: number): Promise<void> {
        if (avaliacao < 1 || avaliacao > 5) {
            throw new Error('Avaliação deve ser entre 1 e 5');
        }

        await this.altera(id, { avaliacao });
    }

    /**
     * Obtém estatísticas de paradas por tipo
     */
    async obterEstatisticasPorTipo(viagemId: string): Promise<{ [key in TipoParada]?: number }> {
        const paradas = await this.listarParadasViagem(viagemId).toPromise();
        const estatisticas: { [key in TipoParada]?: number } = {};

        if (paradas) {
            paradas.forEach(parada => {
                estatisticas[parada.tipo] = (estatisticas[parada.tipo] || 0) + 1;
            });
        }

        return estatisticas;
    }
}