import { Injectable } from '@angular/core';
import {
    Firestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    QueryConstraint
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { BaseEntity } from '../../models';

// Tipos aceitos em comparações simples do Firestore (igualdade)
type FirestoreWhereValue = string | number | boolean | null | Date | Timestamp;

/**
 * Remove valores undefined de forma recursiva de um objeto/array.
 * Mantém instâncias de Date e Timestamp.
 */
function deepCleanUndefined<T>(input: T): T {
    if (Array.isArray(input)) {
        return (input
            .filter((v) => v !== undefined)
            .map((v) => deepCleanUndefined(v)) as unknown) as T;
    }

    if (input && typeof input === 'object' && !(input instanceof Date) && !(input instanceof Timestamp)) {
        const obj = input as unknown as Record<string, unknown>;
        const output: Record<string, unknown> = {};
        Object.keys(obj).forEach((key) => {
            const cleaned = deepCleanUndefined(obj[key]);
            if (cleaned !== undefined) {
                output[key] = cleaned;
            }
        });
        return output as unknown as T;
    }

    return input;
}

/**
 * Interface base para serviços CRUD
 */
export interface BaseService<T extends BaseEntity> {
    novo(dados: Omit<T, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string>;
    altera(id: string, dados: Partial<T>): Promise<void>;
    remove(id: string): Promise<void>;
    lista(constraints?: QueryConstraint[]): Observable<T[]>;
    recuperarPorId(id: string): Observable<T | undefined>;
    recuperarPorOutroParametro(campo: string, valor: FirestoreWhereValue): Observable<T[]>;
}

@Injectable({
    providedIn: 'root'
})
export abstract class BaseFirestoreService<T extends BaseEntity> implements BaseService<T> {
    protected abstract collectionName: string;

    constructor(protected firestore: Firestore) { }

    /**
     * Cria um novo documento
     */
    async novo(dados: Omit<T, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        try {
            const agora = Timestamp.now();
            const dadosCompletos = {
                ...dados,
                criadoEm: agora,
                atualizadoEm: agora
            } as T;

            const dadosLimpos = deepCleanUndefined(dadosCompletos) as T;

            const docRef = await addDoc(
                collection(this.firestore, this.collectionName),
                dadosLimpos
            );

            return docRef.id;
        } catch (error) {
            console.error(`Erro ao criar ${this.collectionName}:`, error);
            throw new Error(`Erro ao criar ${this.collectionName}`);
        }
    }

    /**
     * Atualiza um documento existente
     */
    async altera(id: string, dados: Partial<T>): Promise<void> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);
            const dadosAtualizados = {
                ...dados,
                atualizadoEm: Timestamp.now()
            };

            const dadosLimpos = deepCleanUndefined(dadosAtualizados) as Partial<T>;

            // Casts para compatibilidade com tipos genéricos do AngularFire
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await updateDoc(docRef as any, dadosLimpos as any);
        } catch (error) {
            console.error(`Erro ao atualizar ${this.collectionName}:`, error);
            throw new Error(`Erro ao atualizar ${this.collectionName}`);
        }
    }

    /**
     * Remove um documento
     */
    async remove(id: string): Promise<void> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(`Erro ao remover ${this.collectionName}:`, error);
            throw new Error(`Erro ao remover ${this.collectionName}`);
        }
    }

    /**
     * Lista todos os documentos da coleção
     */
    lista(constraints: QueryConstraint[] = []): Observable<T[]> {
        try {
            const collectionRef = collection(this.firestore, this.collectionName);
            const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

            return from(getDocs(q)).pipe(
                map(snapshot =>
                    snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as T))
                )
            );
        } catch (error) {
            console.error(`Erro ao listar ${this.collectionName}:`, error);
            throw new Error(`Erro ao listar ${this.collectionName}`);
        }
    }

    /**
     * Recupera um documento por ID
     */
    recuperarPorId(id: string): Observable<T | undefined> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);

            return from(getDoc(docRef)).pipe(
                map(docSnap => {
                    if (docSnap.exists()) {
                        return {
                            id: docSnap.id,
                            ...docSnap.data()
                        } as T;
                    }
                    return undefined;
                })
            );
        } catch (error) {
            console.error(`Erro ao recuperar ${this.collectionName}:`, error);
            throw new Error(`Erro ao recuperar ${this.collectionName}`);
        }
    }

    /**
     * Recupera documentos por um campo específico
     */
    recuperarPorOutroParametro(campo: string, valor: FirestoreWhereValue): Observable<T[]> {
        try {
            const collectionRef = collection(this.firestore, this.collectionName);
            const q = query(collectionRef, where(campo, '==', valor));

            return from(getDocs(q)).pipe(
                map(snapshot =>
                    snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as T))
                )
            );
        } catch (error) {
            console.error(`Erro ao buscar ${this.collectionName} por ${campo}:`, error);
            throw new Error(`Erro ao buscar ${this.collectionName}`);
        }
    }

    /**
     * Recupera documentos com ordenação
     */
    recuperarComOrdenacao(campoOrdenacao: string, direcao: 'asc' | 'desc' = 'asc', limite?: number): Observable<T[]> {
        try {
            const collectionRef = collection(this.firestore, this.collectionName);
            const constraints: QueryConstraint[] = [orderBy(campoOrdenacao, direcao)];

            if (limite) {
                constraints.push(limit(limite));
            }

            const q = query(collectionRef, ...constraints);

            return from(getDocs(q)).pipe(
                map(snapshot =>
                    snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as T))
                )
            );
        } catch (error) {
            console.error(`Erro ao buscar ${this.collectionName} ordenado:`, error);
            throw new Error(`Erro ao buscar ${this.collectionName} ordenado`);
        }
    }

    /**
     * Conta o número de documentos na coleção
     */
    async contar(constraints: QueryConstraint[] = []): Promise<number> {
        try {
            const collectionRef = collection(this.firestore, this.collectionName);
            const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error(`Erro ao contar ${this.collectionName}:`, error);
            throw new Error(`Erro ao contar ${this.collectionName}`);
        }
    }
}