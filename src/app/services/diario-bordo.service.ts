import { Injectable } from '@angular/core';
import {
    Firestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable, from, map, switchMap, of } from 'rxjs';
import { DiarioBordo, DiarioBordoForm, DiarioBordoFiltros } from '../models/diario-bordo.interface';
import { AuthService } from '../core/services/auth.service';

/**
 * Serviço para gerenciamento do diário de bordo
 * Fornece funcionalidades para criar, editar, excluir e consultar entradas do diário
 */
@Injectable({
    providedIn: 'root'
})
export class DiarioBordoService {
    private readonly collectionName = 'diario-bordo';

    constructor(
        private firestore: Firestore,
        private storage: Storage,
        private authService: AuthService
    ) { }

    /**
     * Cria uma nova entrada no diário de bordo
     * @param viagemId ID da viagem
     * @param diaViagemId ID do dia da viagem (opcional)
     * @param dados Dados da entrada do diário
     * @returns Promise que resolve quando a entrada for criada
     */
    async criarEntrada(
        viagemId: string,
        dados: DiarioBordoForm,
        diaViagemId?: string
    ): Promise<string> {
        const usuario = await this.authService.getCurrentUser();
        if (!usuario) {
            throw new Error('Usuário não autenticado');
        }

        // Upload das fotos primeiro, se houver
        let fotosUrls: string[] = [];
        if (dados.fotos && dados.fotos.length > 0) {
            fotosUrls = await this.uploadFotos(dados.fotos, viagemId);
        }

        const entrada: Omit<DiarioBordo, 'id'> = {
            viagemId,
            ...(diaViagemId && { diaViagemId }), // Só inclui se tiver valor
            usuarioId: usuario.id!,
            data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
            ...(dados.titulo && { titulo: dados.titulo }), // Só inclui se tiver valor
            conteudo: dados.conteudo,
            ...(fotosUrls.length > 0 && { fotos: fotosUrls }), // Só inclui se tiver fotos
            publico: dados.publico,
            tags: dados.tags || [],
            criadoEm: serverTimestamp() as Timestamp,
            atualizadoEm: serverTimestamp() as Timestamp,
            criadoPor: usuario.id!,
            atualizadoPor: usuario.id!
        };

        const docRef = await addDoc(collection(this.firestore, this.collectionName), entrada);
        return docRef.id;
    }

    /**
     * Atualiza uma entrada existente do diário
     * @param id ID da entrada
     * @param dados Dados atualizados
     * @returns Promise que resolve quando a entrada for atualizada
     */
    async atualizarEntrada(id: string, dados: Partial<DiarioBordoForm>): Promise<void> {
        const usuario = await this.authService.getCurrentUser();
        if (!usuario) {
            throw new Error('Usuário não autenticado');
        }

        const docRef = doc(this.firestore, this.collectionName, id);

        // Preparar dados para atualização
        const dadosAtualizacao: Partial<DiarioBordo> = {
            atualizadoEm: serverTimestamp() as Timestamp,
            atualizadoPor: usuario.id!
        };

        if (dados.titulo !== undefined) dadosAtualizacao.titulo = dados.titulo;
        if (dados.conteudo !== undefined) dadosAtualizacao.conteudo = dados.conteudo;
        if (dados.publico !== undefined) dadosAtualizacao.publico = dados.publico;
        if (dados.tags !== undefined) dadosAtualizacao.tags = dados.tags;

        // Upload de novas fotos se houver
        if (dados.fotos && dados.fotos.length > 0) {
            // Primeiro, obter a entrada atual para saber a viagemId
            const entradaAtual = await this.obterPorId(id);
            if (entradaAtual) {
                const novasFotos = await this.uploadFotos(dados.fotos, entradaAtual.viagemId);
                dadosAtualizacao.fotos = [...(entradaAtual.fotos || []), ...novasFotos];
            }
        }

        await updateDoc(docRef, dadosAtualizacao);
    }

    /**
     * Remove uma entrada do diário
     * @param id ID da entrada a ser removida
     * @returns Promise que resolve quando a entrada for removida
     */
    async removerEntrada(id: string): Promise<void> {
        const entrada = await this.obterPorId(id);
        if (!entrada) {
            throw new Error('Entrada não encontrada');
        }

        // Remover fotos do storage
        if (entrada.fotos && entrada.fotos.length > 0) {
            await this.removerFotos(entrada.fotos);
        }

        // Remover documento do Firestore
        const docRef = doc(this.firestore, this.collectionName, id);
        await deleteDoc(docRef);
    }

    /**
     * Obtém uma entrada específica por ID
     * @param id ID da entrada
     * @returns Promise com a entrada ou null se não encontrada
     */
    async obterPorId(id: string): Promise<DiarioBordo | null> {
        const docRef = doc(this.firestore, this.collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as DiarioBordo;
        }

        return null;
    }

    /**
     * Lista entradas do diário com filtros
     * @param filtros Filtros para a busca
     * @returns Observable com a lista de entradas
     */
    listarEntradas(filtros: DiarioBordoFiltros = {}): Observable<DiarioBordo[]> {
        return from(Promise.resolve(this.authService.getCurrentUser())).pipe(
            switchMap(usuario => {
                if (!usuario || !usuario.id) {
                    return of([]);
                }

                let q = query(
                    collection(this.firestore, this.collectionName),
                    where('usuarioId', '==', usuario.id),
                    orderBy('data', 'desc')
                );

                // Aplicar filtros
                if (filtros.viagemId) {
                    q = query(q, where('viagemId', '==', filtros.viagemId));
                }

                if (filtros.diaViagemId) {
                    q = query(q, where('diaViagemId', '==', filtros.diaViagemId));
                }

                if (filtros.publico !== undefined) {
                    q = query(q, where('publico', '==', filtros.publico));
                }

                return from(getDocs(q)).pipe(
                    map(snapshot =>
                        snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        } as DiarioBordo))
                    )
                );
            })
        );
    }

    /**
     * Obtém entradas de uma viagem específica
     * @param viagemId ID da viagem
     * @returns Observable com as entradas da viagem
     */
    obterEntradasDaViagem(viagemId: string): Observable<DiarioBordo[]> {
        return this.listarEntradas({ viagemId });
    }

    /**
     * Lista entradas por viagem (alias para compatibilidade com exportação)
     */
    listarPorViagem(viagemId: string): Observable<DiarioBordo[]> {
        return this.obterEntradasDaViagem(viagemId);
    }

    /**
     * Obtém entradas de um dia específico da viagem
     * @param diaViagemId ID do dia da viagem
     * @returns Observable com as entradas do dia
     */
    obterEntradasDoDia(diaViagemId: string): Observable<DiarioBordo[]> {
        return this.listarEntradas({ diaViagemId });
    }

    /**
     * Remove uma foto específica de uma entrada
     * @param entradaId ID da entrada
     * @param fotoUrl URL da foto a ser removida
     * @returns Promise que resolve quando a foto for removida
     */
    async removerFoto(entradaId: string, fotoUrl: string): Promise<void> {
        const entrada = await this.obterPorId(entradaId);
        if (!entrada || !entrada.fotos) {
            throw new Error('Entrada ou foto não encontrada');
        }

        // Remover foto do storage
        await this.removerFotos([fotoUrl]);

        // Atualizar entrada removendo a URL da foto
        const fotosAtualizadas = entrada.fotos.filter(url => url !== fotoUrl);
        const docRef = doc(this.firestore, this.collectionName, entradaId);

        await updateDoc(docRef, {
            fotos: fotosAtualizadas,
            atualizadoEm: serverTimestamp()
        });
    }

    /**
     * Faz upload de fotos para o Firebase Storage
     * @param fotos Array de arquivos de foto
     * @param viagemId ID da viagem para organização
     * @returns Promise com array de URLs das fotos
     */
    private async uploadFotos(fotos: File[], viagemId: string): Promise<string[]> {
        const urls: string[] = [];
        const timestamp = Date.now();

        for (let i = 0; i < fotos.length; i++) {
            const foto = fotos[i];
            const nomeArquivo = `diario/${viagemId}/${timestamp}_${i}_${foto.name}`;
            const storageRef = ref(this.storage, nomeArquivo);

            await uploadBytes(storageRef, foto);
            const url = await getDownloadURL(storageRef);
            urls.push(url);
        }

        return urls;
    }

    /**
     * Remove fotos do Firebase Storage
     * @param fotosUrls Array de URLs das fotos a serem removidas
     * @returns Promise que resolve quando todas as fotos forem removidas
     */
    private async removerFotos(fotosUrls: string[]): Promise<void> {
        const promises = fotosUrls.map(async (url) => {
            try {
                const storageRef = ref(this.storage, url);
                await deleteObject(storageRef);
            } catch (error) {
                console.warn('Erro ao remover foto do storage:', error);
                // Não falhar se a foto já foi removida ou não existe
            }
        });

        await Promise.all(promises);
    }

    /**
     * Busca entradas por texto no conteúdo ou título
     * @param termo Termo de busca
     * @param viagemId ID da viagem (opcional)
     * @returns Observable com entradas que contêm o termo
     */
    buscarEntradas(termo: string, viagemId?: string): Observable<DiarioBordo[]> {
        const filtros: DiarioBordoFiltros = viagemId ? { viagemId } : {};

        return this.listarEntradas(filtros).pipe(
            map(entradas =>
                entradas.filter(entrada =>
                    entrada.titulo?.toLowerCase().includes(termo.toLowerCase()) ||
                    entrada.conteudo.toLowerCase().includes(termo.toLowerCase()) ||
                    entrada.tags?.some(tag => tag.toLowerCase().includes(termo.toLowerCase()))
                )
            )
        );
    }
}