import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { DiaViagem } from '../models';

@Injectable({
    providedIn: 'root'
})
export class DiasViagemService extends BaseFirestoreService<DiaViagem> {
    protected collectionName = 'dias-viagem';

    constructor(firestore: any) {
        super(firestore);
    }

    /**
     * Lista dias de uma viagem específica
     */
    listarDiasViagem(viagemId: string): Observable<DiaViagem[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            orderBy('numeroDia', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Cria novo dia de viagem
     */
    async criarDiaViagem(dadosDia: Omit<DiaViagem, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        return this.novo(dadosDia);
    }

    /**
     * Obtém dia específico por número
     */
    obterDiaPorNumero(viagemId: string, numeroDia: number): Observable<DiaViagem[]> {
        const constraints: QueryConstraint[] = [
            where('viagemId', '==', viagemId),
            where('numeroDia', '==', numeroDia)
        ];

        return this.lista(constraints);
    }

    /**
     * Atualiza distância percorrida
     */
    async atualizarDistanciaPercorrida(id: string, distancia: number): Promise<void> {
        await this.altera(id, { distanciaPercorrida: distancia });
    }

    /**
     * Atualiza horários reais
     */
    async atualizarHorariosReais(id: string, horaPartida?: string, horaChegada?: string): Promise<void> {
        const updates: Partial<DiaViagem> = {};

        if (horaPartida) {
            updates.horaPartidaReal = horaPartida;
        }

        if (horaChegada) {
            updates.horaChegadaReal = horaChegada;
        }

        await this.altera(id, updates);
    }

    /**
     * Adiciona foto ao dia
     */
    async adicionarFoto(id: string, fotoUrl: string): Promise<void> {
        const dia = await this.recuperarPorId(id).toPromise();
        if (dia) {
            const fotosAtuais = dia.fotos || [];
            await this.altera(id, { fotos: [...fotosAtuais, fotoUrl] });
        }
    }

    /**
     * Remove foto do dia
     */
    async removerFoto(id: string, fotoUrl: string): Promise<void> {
        const dia = await this.recuperarPorId(id).toPromise();
        if (dia && dia.fotos) {
            const fotosAtualizadas = dia.fotos.filter(foto => foto !== fotoUrl);
            await this.altera(id, { fotos: fotosAtualizadas });
        }
    }

    /**
     * Atualiza condições climáticas
     */
    async atualizarClima(id: string, condicao: any, tempMin?: number, tempMax?: number): Promise<void> {
        const updates: Partial<DiaViagem> = {
            condicaoClimatica: condicao
        };

        if (tempMin !== undefined) {
            updates.temperaturaMin = tempMin;
        }

        if (tempMax !== undefined) {
            updates.temperaturaMax = tempMax;
        }

        await this.altera(id, updates);
    }
}