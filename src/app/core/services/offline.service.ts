import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface PendingOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    collection: string;
    data: any;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class OfflineService {
    private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
    public isOnline$ = this.isOnlineSubject.asObservable();

    private pendingOperations: PendingOperation[] = [];
    private readonly STORAGE_KEY = 'andes_pending_operations';

    constructor() {
        this.initOnlineListener();
        this.loadPendingOperations();
    }

    /**
     * Inicializa listener para mudanças de conectividade
     */
    private initOnlineListener(): void {
        merge(
            fromEvent(window, 'online').pipe(map(() => true)),
            fromEvent(window, 'offline').pipe(map(() => false))
        ).pipe(
            startWith(navigator.onLine)
        ).subscribe(isOnline => {
            this.isOnlineSubject.next(isOnline);

            if (isOnline) {
                this.syncPendingOperations();
            }
        });
    }

    /**
     * Verifica se está online
     */
    isOnline(): boolean {
        return this.isOnlineSubject.value;
    }

    /**
     * Adiciona operação à fila de sincronização
     */
    addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp'>): void {
        const pendingOp: PendingOperation = {
            ...operation,
            id: this.generateId(),
            timestamp: Date.now()
        };

        this.pendingOperations.push(pendingOp);
        this.savePendingOperations();
    }

    /**
     * Obtém operações pendentes
     */
    getPendingOperations(): PendingOperation[] {
        return [...this.pendingOperations];
    }

    /**
     * Remove operação da fila
     */
    removePendingOperation(id: string): void {
        this.pendingOperations = this.pendingOperations.filter(op => op.id !== id);
        this.savePendingOperations();
    }

    /**
     * Sincroniza operações pendentes quando volta online
     */
    private async syncPendingOperations(): Promise<void> {
        if (this.pendingOperations.length === 0) {
            return;
        }

        console.log(`Sincronizando ${this.pendingOperations.length} operações pendentes...`);

        // Ordenar por timestamp para manter ordem cronológica
        const sortedOperations = this.pendingOperations.sort((a, b) => a.timestamp - b.timestamp);

        for (const operation of sortedOperations) {
            try {
                await this.executeOperation(operation);
                this.removePendingOperation(operation.id);
                console.log(`Operação ${operation.id} sincronizada com sucesso`);
            } catch (error) {
                console.error(`Erro ao sincronizar operação ${operation.id}:`, error);
                // Manter operação na fila para tentar novamente
            }
        }
    }

    /**
     * Executa uma operação pendente
     */
    private async executeOperation(operation: PendingOperation): Promise<void> {
        // Aqui seria implementada a lógica específica para cada tipo de operação
        // Por enquanto, apenas simula a execução
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Executando operação ${operation.type} na coleção ${operation.collection}`);
                resolve();
            }, 100);
        });
    }
    /**
      * Salva operações pendentes no localStorage
      */
    private savePendingOperations(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pendingOperations));
        } catch (error) {
            console.error('Erro ao salvar operações pendentes:', error);
        }
    }

    /**
     * Carrega operações pendentes do localStorage
     */
    private loadPendingOperations(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.pendingOperations = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Erro ao carregar operações pendentes:', error);
            this.pendingOperations = [];
        }
    }

    /**
     * Gera ID único para operação
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Limpa todas as operações pendentes
     */
    clearPendingOperations(): void {
        this.pendingOperations = [];
        this.savePendingOperations();
    }

    /**
     * Obtém status de conectividade como Observable
     */
    getConnectivityStatus(): Observable<boolean> {
        return this.isOnline$;
    }

    /**
     * Força sincronização manual
     */
    async forcSync(): Promise<void> {
        if (this.isOnline()) {
            await this.syncPendingOperations();
        } else {
            throw new Error('Não é possível sincronizar offline');
        }
    }

    /**
     * Obtém estatísticas das operações pendentes
     */
    getPendingStats(): { total: number; byType: { [key: string]: number } } {
        const stats = {
            total: this.pendingOperations.length,
            byType: {} as { [key: string]: number }
        };

        this.pendingOperations.forEach(op => {
            stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;
        });

        return stats;
    }
}