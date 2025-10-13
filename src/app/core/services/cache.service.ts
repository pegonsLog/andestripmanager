import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live em milissegundos
    priority: CachePriority;
    size?: number; // Tamanho estimado em bytes
}

export enum CachePriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    CRITICAL = 4
}

export interface CacheStrategy {
    name: string;
    ttl: number;
    priority: CachePriority;
    persistToStorage?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private memoryCache = new Map<string, CacheItem<any>>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
    private readonly MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB
    private readonly STORAGE_PREFIX = 'andes_cache_';

    // Estratégias de cache predefinidas
    public readonly strategies = {
        QUICK: { name: 'quick', ttl: 1 * 60 * 1000, priority: CachePriority.LOW } as CacheStrategy,
        NORMAL: { name: 'normal', ttl: 5 * 60 * 1000, priority: CachePriority.NORMAL } as CacheStrategy,
        LONG: { name: 'long', ttl: 30 * 60 * 1000, priority: CachePriority.HIGH } as CacheStrategy,
        PERSISTENT: {
            name: 'persistent',
            ttl: 24 * 60 * 60 * 1000,
            priority: CachePriority.CRITICAL,
            persistToStorage: true
        } as CacheStrategy,
        OFFLINE: {
            name: 'offline',
            ttl: 7 * 24 * 60 * 60 * 1000,
            priority: CachePriority.CRITICAL,
            persistToStorage: true
        } as CacheStrategy
    };

    constructor() {
        this.initCleanupInterval();
        this.loadFromStorage();
    }

    /**
     * Inicializa limpeza automática do cache
     */
    private initCleanupInterval(): void {
        // Limpar itens expirados a cada 5 minutos
        setInterval(() => {
            this.cleanExpired();
            this.enforceMemoryLimit();
        }, 5 * 60 * 1000);
    }

    /**
     * Carrega dados persistentes do localStorage
     */
    private loadFromStorage(): void {
        try {
            const keys = Object.keys(localStorage).filter(key =>
                key.startsWith(this.STORAGE_PREFIX)
            );

            for (const storageKey of keys) {
                const cacheKey = storageKey.replace(this.STORAGE_PREFIX, '');
                const stored = localStorage.getItem(storageKey);

                if (stored) {
                    const item: CacheItem<any> = JSON.parse(stored);

                    // Verificar se não expirou
                    if (Date.now() - item.timestamp <= item.ttl) {
                        this.memoryCache.set(cacheKey, item);
                    } else {
                        localStorage.removeItem(storageKey);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao carregar cache do localStorage:', error);
        }
    }

    /**
     * Armazena dados no cache
     */
    set<T>(key: string, data: T, strategy: CacheStrategy = this.strategies.NORMAL): void {
        const size = this.estimateSize(data);
        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            ttl: strategy.ttl,
            priority: strategy.priority,
            size
        };

        this.memoryCache.set(key, item);

        // Persistir no localStorage se necessário
        if (strategy.persistToStorage) {
            this.persistToStorage(key, item);
        }

        // Verificar limite de memória
        this.enforceMemoryLimit();
    }

    /**
     * Armazena dados no cache com TTL customizado (método legado)
     */
    setWithTtl<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        const strategy: CacheStrategy = {
            name: 'custom',
            ttl,
            priority: CachePriority.NORMAL
        };
        this.set(key, data, strategy);
    }

    /**
     * Recupera dados do cache
     */
    get<T>(key: string): T | null {
        let item: CacheItem<any> | undefined = this.memoryCache.get(key);

        // Se não estiver na memória, tentar carregar do localStorage
        if (!item) {
            const loadedItem = this.loadFromStorageKey(key);
            if (loadedItem) {
                item = loadedItem;
                this.memoryCache.set(key, item);
            }
        }

        if (!item) {
            return null;
        }

        // Verificar se o item expirou
        if (Date.now() - item.timestamp > item.ttl) {
            this.delete(key);
            return null;
        }

        return item.data as T;
    }

    /**
     * Carrega item específico do localStorage
     */
    private loadFromStorageKey(key: string): CacheItem<any> | null {
        try {
            const storageKey = this.STORAGE_PREFIX + key;
            const stored = localStorage.getItem(storageKey);

            if (stored) {
                const item: CacheItem<any> = JSON.parse(stored);

                // Verificar se não expirou
                if (Date.now() - item.timestamp <= item.ttl) {
                    return item;
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar item do localStorage:', error);
        }

        return null;
    }

    /**
     * Verifica se uma chave existe no cache e não expirou
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Remove um item do cache
     */
    delete(key: string): boolean {
        const deleted = this.memoryCache.delete(key);

        // Remover também do localStorage
        try {
            localStorage.removeItem(this.STORAGE_PREFIX + key);
        } catch (error) {
            console.error('Erro ao remover item do localStorage:', error);
        }

        return deleted;
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.memoryCache.clear();

        // Limpar também do localStorage
        try {
            const keys = Object.keys(localStorage).filter(key =>
                key.startsWith(this.STORAGE_PREFIX)
            );

            for (const key of keys) {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
        }
    }

    /**
     * Obtém o tamanho atual do cache
     */
    size(): number {
        return this.memoryCache.size;
    }

    /**
     * Lista todas as chaves do cache
     */
    keys(): string[] {
        return Array.from(this.memoryCache.keys());
    }

    /**
     * Remove itens expirados do cache
     */
    cleanExpired(): number {
        let removedCount = 0;
        const now = Date.now();

        for (const [key, item] of this.memoryCache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.delete(key);
                removedCount++;
            }
        }

        return removedCount;
    }

    /**
     * Persiste item no localStorage
     */
    private persistToStorage(key: string, item: CacheItem<any>): void {
        try {
            const storageKey = this.STORAGE_PREFIX + key;
            localStorage.setItem(storageKey, JSON.stringify(item));
        } catch (error) {
            console.error('Erro ao persistir no localStorage:', error);
            // Se não conseguir salvar, remover itens menos importantes
            this.cleanLowPriorityItems();
        }
    }

    /**
     * Estima o tamanho de um objeto em bytes
     */
    private estimateSize(data: any): number {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            return 1024; // Estimativa padrão de 1KB
        }
    }

    /**
     * Força limite de memória removendo itens menos importantes
     */
    private enforceMemoryLimit(): void {
        const currentSize = this.getCurrentMemorySize();

        if (currentSize > this.MAX_MEMORY_SIZE) {
            this.cleanLowPriorityItems();
        }
    }

    /**
     * Obtém tamanho atual da memória cache
     */
    private getCurrentMemorySize(): number {
        let totalSize = 0;

        for (const item of this.memoryCache.values()) {
            totalSize += item.size || 1024;
        }

        return totalSize;
    }

    /**
     * Remove itens de baixa prioridade
     */
    private cleanLowPriorityItems(): void {
        const items = Array.from(this.memoryCache.entries())
            .sort(([, a], [, b]) => {
                // Ordenar por prioridade (menor primeiro) e depois por idade (mais antigo primeiro)
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return a.timestamp - b.timestamp;
            });

        // Remover até 25% dos itens de menor prioridade
        const itemsToRemove = Math.ceil(items.length * 0.25);

        for (let i = 0; i < itemsToRemove && i < items.length; i++) {
            const [key] = items[i];
            this.delete(key);
        }
    }

    /**
     * Obtém ou define dados com cache automático
     */
    getOrSet<T>(
        key: string,
        factory: () => Observable<T>,
        strategy: CacheStrategy = this.strategies.NORMAL
    ): Observable<T> {
        const cached = this.get<T>(key);

        if (cached !== null) {
            return of(cached);
        }

        return factory().pipe(
            tap(data => this.set(key, data, strategy)),
            catchError(error => {
                console.error(`Erro ao obter dados para cache key ${key}:`, error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Obtém estatísticas do cache
     */
    getStats(): {
        memorySize: number;
        memoryEntries: number;
        storageEntries: number;
        totalSize: number;
        hitRate?: number;
    } {
        const memorySize = this.getCurrentMemorySize();
        const memoryEntries = this.memoryCache.size;

        let storageEntries = 0;
        try {
            storageEntries = Object.keys(localStorage)
                .filter(key => key.startsWith(this.STORAGE_PREFIX))
                .length;
        } catch (error) {
            console.error('Erro ao contar entradas do localStorage:', error);
        }

        return {
            memorySize,
            memoryEntries,
            storageEntries,
            totalSize: memorySize
        };
    }

    /**
     * Invalida cache por padrão de chave
     */
    invalidatePattern(pattern: string): number {
        let invalidatedCount = 0;
        const regex = new RegExp(pattern);

        for (const key of this.keys()) {
            if (regex.test(key)) {
                this.delete(key);
                invalidatedCount++;
            }
        }

        return invalidatedCount;
    }

    /**
     * Pré-carrega dados críticos
     */
    preload<T>(key: string, factory: () => Observable<T>): Observable<T> {
        return this.getOrSet(key, factory, this.strategies.PERSISTENT);
    }
}