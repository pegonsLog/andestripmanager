import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of, from } from 'rxjs';
import { map, startWith, switchMap, catchError, tap, delay, retry } from 'rxjs/operators';
import { CacheService, CacheStrategy } from './cache.service';

export interface PendingOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    collection: string;
    data: any;
    timestamp: number;
    retryCount?: number;
    maxRetries?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface SyncResult {
    success: boolean;
    operationId: string;
    error?: any;
}

export interface OfflineData<T> {
    data: T;
    lastSync: number;
    isStale: boolean;
    source: 'cache' | 'storage' | 'network';
}

@Injectable({
    providedIn: 'root'
})
export class OfflineService {
    private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
    public isOnline$ = this.isOnlineSubject.asObservable();

    private pendingOperations: PendingOperation[] = [];
    private syncInProgress = false;
    private readonly STORAGE_KEY = 'andes_pending_operations';
    private readonly CRITICAL_DATA_KEY = 'andes_critical_data';

    constructor(private cacheService: CacheService) {
        this.initOnlineListener();
        this.loadPendingOperations();
        this.initAutoSync();
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

            if (isOnline && !this.syncInProgress) {
                // Aguardar um pouco para garantir que a conexão está estável
                setTimeout(() => {
                    this.syncPendingOperations();
                }, 2000);
            }
        });
    }

    /**
     * Inicializa sincronização automática
     */
    private initAutoSync(): void {
        // Sincronizar a cada 5 minutos quando online
        setInterval(() => {
            if (this.isOnline() && !this.syncInProgress && this.pendingOperations.length > 0) {
                this.syncPendingOperations();
            }
        }, 5 * 60 * 1000);
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
    addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp'>): string {
        const pendingOp: PendingOperation = {
            ...operation,
            id: this.generateId(),
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: operation.priority === 'critical' ? 10 : 3,
            priority: operation.priority || 'normal'
        };

        this.pendingOperations.push(pendingOp);
        this.savePendingOperations();

        // Tentar sincronizar imediatamente se estiver online
        if (this.isOnline() && !this.syncInProgress) {
            setTimeout(() => this.syncPendingOperations(), 1000);
        }

        return pendingOp.id;
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
    private async syncPendingOperations(): Promise<SyncResult[]> {
        if (this.pendingOperations.length === 0 || this.syncInProgress) {
            return [];
        }

        this.syncInProgress = true;
        const results: SyncResult[] = [];

        try {
            console.log(`Sincronizando ${this.pendingOperations.length} operações pendentes...`);

            // Ordenar por prioridade e depois por timestamp
            const sortedOperations = this.pendingOperations.sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
                const aPriority = priorityOrder[a.priority || 'normal'];
                const bPriority = priorityOrder[b.priority || 'normal'];

                if (aPriority !== bPriority) {
                    return bPriority - aPriority; // Maior prioridade primeiro
                }

                return a.timestamp - b.timestamp; // Mais antigo primeiro
            });

            for (const operation of sortedOperations) {
                try {
                    await this.executeOperation(operation);
                    this.removePendingOperation(operation.id);

                    const result: SyncResult = {
                        success: true,
                        operationId: operation.id
                    };
                    results.push(result);

                    console.log(`Operação ${operation.id} sincronizada com sucesso`);
                } catch (error) {
                    console.error(`Erro ao sincronizar operação ${operation.id}:`, error);

                    // Incrementar contador de tentativas
                    operation.retryCount = (operation.retryCount || 0) + 1;

                    const result: SyncResult = {
                        success: false,
                        operationId: operation.id,
                        error
                    };
                    results.push(result);

                    // Remover se excedeu o número máximo de tentativas
                    if (operation.retryCount >= (operation.maxRetries || 3)) {
                        console.warn(`Operação ${operation.id} removida após ${operation.retryCount} tentativas`);
                        this.removePendingOperation(operation.id);
                    } else {
                        // Salvar operação atualizada com novo contador
                        this.savePendingOperations();
                    }
                }

                // Pequena pausa entre operações para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`Sincronização concluída. ${results.filter(r => r.success).length} sucessos, ${results.filter(r => !r.success).length} falhas`);
        } finally {
            this.syncInProgress = false;
        }

        return results;
    }

    /**
     * Executa uma operação pendente
     */
    private async executeOperation(operation: PendingOperation): Promise<void> {
        // Simular execução da operação
        // Em uma implementação real, isso seria integrado com os serviços específicos
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simular falha ocasional para testar retry
                if (Math.random() < 0.1) { // 10% de chance de falha
                    reject(new Error(`Falha simulada na operação ${operation.id}`));
                } else {
                    console.log(`Executando operação ${operation.type} na coleção ${operation.collection}`);
                    resolve();
                }
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
    getPendingStats(): {
        total: number;
        byType: { [key: string]: number };
        byPriority: { [key: string]: number };
        oldestOperation?: number;
    } {
        const stats = {
            total: this.pendingOperations.length,
            byType: {} as { [key: string]: number },
            byPriority: {} as { [key: string]: number }
        };

        let oldestTimestamp = Date.now();

        this.pendingOperations.forEach(op => {
            stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;
            stats.byPriority[op.priority || 'normal'] = (stats.byPriority[op.priority || 'normal'] || 0) + 1;

            if (op.timestamp < oldestTimestamp) {
                oldestTimestamp = op.timestamp;
            }
        });

        if (this.pendingOperations.length > 0) {
            stats.oldestOperation = Date.now() - oldestTimestamp;
        }

        return stats;
    }

    /**
     * Armazena dados críticos para acesso offline
     */
    storeCriticalData<T>(key: string, data: T): void {
        try {
            const criticalData = this.getCriticalDataStorage();
            criticalData[key] = {
                data,
                timestamp: Date.now()
            };

            localStorage.setItem(this.CRITICAL_DATA_KEY, JSON.stringify(criticalData));

            // Também armazenar no cache com estratégia offline
            this.cacheService.set(key, data, this.cacheService.strategies.OFFLINE);
        } catch (error) {
            console.error('Erro ao armazenar dados críticos:', error);
        }
    }

    /**
     * Recupera dados críticos armazenados
     */
    getCriticalData<T>(key: string): T | null {
        // Primeiro tentar do cache
        const cached = this.cacheService.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Se não estiver no cache, tentar do localStorage
        try {
            const criticalData = this.getCriticalDataStorage();
            const item = criticalData[key];

            if (item) {
                // Recolocar no cache
                this.cacheService.set(key, item.data, this.cacheService.strategies.OFFLINE);
                return item.data;
            }
        } catch (error) {
            console.error('Erro ao recuperar dados críticos:', error);
        }

        return null;
    }

    /**
     * Obtém armazenamento de dados críticos
     */
    private getCriticalDataStorage(): { [key: string]: { data: any; timestamp: number } } {
        try {
            const stored = localStorage.getItem(this.CRITICAL_DATA_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Erro ao acessar dados críticos:', error);
            return {};
        }
    }

    /**
     * Limpa dados críticos antigos
     */
    cleanOldCriticalData(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
        try {
            const criticalData = this.getCriticalDataStorage();
            const now = Date.now();
            let removedCount = 0;

            for (const [key, item] of Object.entries(criticalData)) {
                if (now - item.timestamp > maxAge) {
                    delete criticalData[key];
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                localStorage.setItem(this.CRITICAL_DATA_KEY, JSON.stringify(criticalData));
            }

            return removedCount;
        } catch (error) {
            console.error('Erro ao limpar dados críticos:', error);
            return 0;
        }
    }

    /**
     * Obtém dados com fallback offline
     */
    getDataWithOfflineFallback<T>(
        key: string,
        networkFactory: () => Observable<T>,
        cacheStrategy: CacheStrategy = this.cacheService.strategies.NORMAL
    ): Observable<OfflineData<T>> {
        return this.cacheService.getOrSet(key, networkFactory, cacheStrategy).pipe(
            map(data => ({
                data,
                lastSync: Date.now(),
                isStale: false,
                source: this.isOnline() ? 'network' : 'cache'
            } as OfflineData<T>)),
            catchError(error => {
                // Se falhar, tentar dados críticos
                const criticalData = this.getCriticalData<T>(key);

                if (criticalData !== null) {
                    return of({
                        data: criticalData,
                        lastSync: 0, // Desconhecido
                        isStale: true,
                        source: 'storage'
                    } as OfflineData<T>);
                }

                throw error;
            })
        );
    }

    /**
     * Verifica se há dados em cache para uma chave
     */
    hasOfflineData(key: string): boolean {
        return this.cacheService.has(key) || this.getCriticalData(key) !== null;
    }

    /**
     * Obtém informações sobre o status de sincronização
     */
    getSyncStatus(): {
        isOnline: boolean;
        syncInProgress: boolean;
        pendingOperations: number;
        lastSyncAttempt?: number;
    } {
        return {
            isOnline: this.isOnline(),
            syncInProgress: this.syncInProgress,
            pendingOperations: this.pendingOperations.length,
            // lastSyncAttempt seria implementado com timestamp real
        };
    }

    /**
     * Força limpeza de dados offline antigos
     */
    cleanupOfflineData(): { cacheCleared: number; criticalDataCleared: number } {
        const cacheCleared = this.cacheService.cleanExpired();
        const criticalDataCleared = this.cleanOldCriticalData();

        return {
            cacheCleared,
            criticalDataCleared
        };
    }
}