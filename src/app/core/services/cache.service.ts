import { Injectable } from '@angular/core';

interface CacheItem<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live em milissegundos
}

@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private cache = new Map<string, CacheItem<any>>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

    /**
     * Armazena dados no cache
     */
    set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        const item: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            ttl
        };

        this.cache.set(key, item);

        // Agendar limpeza automática
        setTimeout(() => {
            this.delete(key);
        }, ttl);
    }

    /**
     * Recupera dados do cache
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key);

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
     * Verifica se uma chave existe no cache e não expirou
     */
    has(key: string): boolean {
        const item = this.cache.get(key);

        if (!item) {
            return false;
        }

        // Verificar se o item expirou
        if (Date.now() - item.timestamp > item.ttl) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Remove um item do cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Obtém o tamanho atual do cache
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Lista todas as chaves do cache
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Remove itens expirados do cache
     */
    cleanExpired(): number {
        let removedCount = 0;
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
                removedCount++;
            }
        }

        return removedCount;
    }
}