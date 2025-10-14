import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Firestore, where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { Hospedagem } from '../models';
import { TipoHospedagem } from '../models/hospedagem.interface';
import { AuthService } from '../core/services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class HospedagensService extends BaseFirestoreService<Hospedagem> {
    protected collectionName = 'hospedagens';

    constructor(
        firestore: Firestore,
        private authService: AuthService
    ) {
        super(firestore);
    }

    /**
     * Lista hospedagens de uma viagem
     */
    listarHospedagensViagem(viagemId: string): Observable<Hospedagem[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            orderBy('dataCheckIn', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista hospedagens por tipo
     */
    listarPorTipo(viagemId: string, tipo: TipoHospedagem): Observable<Hospedagem[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            where('tipo', '==', tipo),
            orderBy('dataCheckIn', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Cria nova hospedagem
     */
    async criarHospedagem(dadosHospedagem: Omit<Hospedagem, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        // Calcular número de noites
        const checkIn = new Date(dadosHospedagem.dataCheckIn);
        const checkOut = new Date(dadosHospedagem.dataCheckOut);
        const diffTime = checkOut.getTime() - checkIn.getTime();
        const numeroNoites = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Calcular valor total
        const valorTotal = dadosHospedagem.valorDiaria * numeroNoites;

        return this.novo({
            ...dadosHospedagem,
            numeroNoites,
            valorTotal
        });
    }

    /**
     * Atualiza avaliação da hospedagem
     */
    async atualizarAvaliacao(id: string, avaliacao: number): Promise<void> {
        if (avaliacao < 1 || avaliacao > 5) {
            throw new Error('Avaliação deve ser entre 1 e 5');
        }

        await this.altera(id, { avaliacao });
    }

    /**
     * Adiciona comodidade
     */
    async adicionarComodidade(id: string, comodidade: string): Promise<void> {
        const hospedagem = await this.recuperarPorId(id).toPromise();
        if (hospedagem) {
            const comodidadesAtuais = hospedagem.comodidades || [];
            if (!comodidadesAtuais.includes(comodidade)) {
                await this.altera(id, { comodidades: [...comodidadesAtuais, comodidade] });
            }
        }
    }

    /**
     * Remove comodidade
     */
    async removerComodidade(id: string, comodidade: string): Promise<void> {
        const hospedagem = await this.recuperarPorId(id).toPromise();
        if (hospedagem && hospedagem.comodidades) {
            const comodidadesAtualizadas = hospedagem.comodidades.filter(c => c !== comodidade);
            await this.altera(id, { comodidades: comodidadesAtualizadas });
        }
    }

    /**
     * Adiciona foto à hospedagem
     */
    async adicionarFoto(id: string, fotoUrl: string): Promise<void> {
        const hospedagem = await this.recuperarPorId(id).toPromise();
        if (hospedagem) {
            const fotosAtuais = hospedagem.fotos || [];
            await this.altera(id, { fotos: [...fotosAtuais, fotoUrl] });
        }
    }

    /**
     * Calcula custo total de hospedagens da viagem
     */
    async calcularCustoTotal(viagemId: string): Promise<number> {
        const hospedagens = await this.listarHospedagensViagem(viagemId).toPromise();

        if (!hospedagens) return 0;

        return hospedagens.reduce((total, hospedagem) => total + hospedagem.valorTotal, 0);
    }
}