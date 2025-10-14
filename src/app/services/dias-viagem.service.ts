import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Firestore, where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { DiaViagem } from '../models';
import { AuthService } from '../core/services/auth.service';
import { CondicaoClimatica } from '../models/enums';

@Injectable({
    providedIn: 'root'
})
export class DiasViagemService extends BaseFirestoreService<DiaViagem> {
    protected collectionName = 'dias-viagem';

    constructor(
        firestore: Firestore,
        private authService: AuthService
    ) {
        super(firestore);
    }

    /**
     * Lista dias de uma viagem específica
     * Filtra automaticamente pelo usuário autenticado
     */
    listarDiasViagem(viagemId: string): Observable<DiaViagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            where('viagemId', '==', viagemId),
            orderBy('numeroDia', 'asc')
        ];

        return this.lista(constraints);
    }

    /**
     * Cria novo dia de viagem
     */
    async criarDiaViagem(dadosDia: Omit<DiaViagem, 'id' | 'usuarioId' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const diaCompleto = {
            ...dadosDia,
            usuarioId: usuario.id
        };

        return this.novo(diaCompleto);
    }

    /**
     * Obtém dia específico por número
     * Filtra automaticamente pelo usuário autenticado
     */
    obterDiaPorNumero(viagemId: string, numeroDia: number): Observable<DiaViagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
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
    async atualizarClima(id: string, condicao: CondicaoClimatica, tempMin?: number, tempMax?: number): Promise<void> {
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