import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Firestore, where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { Viagem, StatusViagem } from '../models';
import { AuthService } from '../core/services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class ViagensService extends BaseFirestoreService<Viagem> {
    protected collectionName = 'viagens';

    constructor(
        firestore: Firestore,
        private authService: AuthService
    ) {
        super(firestore);
    }

    /**
     * Lista viagens do usuário atual
     */
    listarViagensUsuario(): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            orderBy('dataInicio', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista viagens por status
     */
    listarPorStatus(status: StatusViagem): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            where('status', '==', status),
            orderBy('dataInicio', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Busca viagens por nome
     */
    buscarPorNome(nome: string): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        return this.listarViagensUsuario().pipe(
            map(viagens =>
                viagens.filter(viagem =>
                    viagem.nome.toLowerCase().includes(nome.toLowerCase())
                )
            )
        );
    }

    /**
     * Cria nova viagem para o usuário atual
     */
    async criarViagem(dadosViagem: Omit<Viagem, 'id' | 'usuarioId' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const viagem: Omit<Viagem, 'id' | 'criadoEm' | 'atualizadoEm'> = {
            ...dadosViagem,
            usuarioId: usuario.id,
            status: StatusViagem.PLANEJADA,
            numeroDias: this.calcularNumeroDias(dadosViagem.dataInicio, dadosViagem.dataFim)
        };

        return this.novo(viagem);
    }

    /**
     * Atualiza status da viagem
     */
    async atualizarStatus(id: string, status: StatusViagem): Promise<void> {
        await this.altera(id, { status });
    }

    /**
     * Calcula estatísticas da viagem
     */
    async calcularEstatisticas(viagemId: string): Promise<void> {
        // Aqui seria implementada a lógica para calcular estatísticas
        // baseada nos dias, paradas e custos da viagem
        console.log(`Calculando estatísticas para viagem ${viagemId}`);
    }

    /**
     * Calcula número de dias entre duas datas
     */
    private calcularNumeroDias(dataInicio: string, dataFim: string): number {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Obtém viagens recentes (últimas 5)
     */
    obterViagensRecentes(): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            orderBy('atualizadoEm', 'desc')
        ];

        return this.lista(constraints).pipe(
            map(viagens => viagens.slice(0, 5))
        );
    }
}