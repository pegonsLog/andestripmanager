import { Injectable } from '@angular/core';
import { SwUpdate, SwPush } from '@angular/service-worker';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map, startWith, filter, switchMap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ConnectivityStatus {
    isOnline: boolean;
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
}

@Injectable({
    providedIn: 'root'
})
export class PwaService {
    private connectivitySubject = new BehaviorSubject<ConnectivityStatus>({
        isOnline: navigator.onLine
    });

    public connectivity$ = this.connectivitySubject.asObservable();
    private updateAvailable = false;

    constructor(
        private swUpdate: SwUpdate,
        private swPush: SwPush,
        private snackBar: MatSnackBar
    ) {
        this.initConnectivityMonitoring();
        this.initServiceWorkerUpdates();
    }

    /**
     * Inicializa monitoramento de conectividade
     */
    private initConnectivityMonitoring(): void {
        // Eventos básicos de conectividade
        merge(
            fromEvent(window, 'online').pipe(map(() => true)),
            fromEvent(window, 'offline').pipe(map(() => false))
        ).pipe(
            startWith(navigator.onLine)
        ).subscribe(isOnline => {
            this.updateConnectivityStatus(isOnline);
        });

        // Monitoramento avançado de conectividade (se disponível)
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;

            fromEvent(connection, 'change').subscribe(() => {
                this.updateConnectivityStatus(navigator.onLine);
            });
        }
    }

    /**
     * Atualiza status de conectividade
     */
    private updateConnectivityStatus(isOnline: boolean): void {
        const status: ConnectivityStatus = {
            isOnline
        };

        // Adicionar informações de rede se disponível
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            status.connectionType = connection.type;
            status.effectiveType = connection.effectiveType;
            status.downlink = connection.downlink;
            status.rtt = connection.rtt;
        }

        this.connectivitySubject.next(status);

        // Mostrar notificação de mudança de status
        if (isOnline) {
            this.showConnectivityNotification('Conexão restaurada', 'success');
        } else {
            this.showConnectivityNotification('Modo offline ativado', 'warning');
        }
    }

    /**
     * Inicializa atualizações do Service Worker
     */
    private initServiceWorkerUpdates(): void {
        if (!this.swUpdate.isEnabled) {
            return;
        }

        // Verificar atualizações disponíveis
        this.swUpdate.versionUpdates.pipe(
            filter(evt => evt.type === 'VERSION_READY')
        ).subscribe(() => {
            this.updateAvailable = true;
            this.showUpdateNotification();
        });

        // Verificar atualizações periodicamente
        this.swUpdate.checkForUpdate();
        setInterval(() => {
            this.swUpdate.checkForUpdate();
        }, 60000); // Verificar a cada minuto
    }

    /**
     * Mostra notificação de atualização disponível
     */
    private showUpdateNotification(): void {
        const snackBarRef = this.snackBar.open(
            'Nova versão disponível!',
            'Atualizar',
            {
                duration: 0, // Não fechar automaticamente
                panelClass: ['update-snackbar']
            }
        );

        snackBarRef.onAction().subscribe(() => {
            this.applyUpdate();
        });
    }

    /**
     * Aplica atualização do Service Worker
     */
    async applyUpdate(): Promise<void> {
        if (!this.updateAvailable) {
            return;
        }

        try {
            await this.swUpdate.activateUpdate();
            window.location.reload();
        } catch (error) {
            console.error('Erro ao aplicar atualização:', error);
            this.snackBar.open(
                'Erro ao atualizar. Tente novamente.',
                'Fechar',
                { duration: 5000 }
            );
        }
    }

    /**
     * Mostra notificação de conectividade
     */
    private showConnectivityNotification(message: string, type: 'success' | 'warning'): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 3000,
            panelClass: [`${type}-snackbar`]
        });
    }

    /**
     * Verifica se está online
     */
    isOnline(): boolean {
        return this.connectivitySubject.value.isOnline;
    }

    /**
     * Obtém status de conectividade atual
     */
    getConnectivityStatus(): ConnectivityStatus {
        return this.connectivitySubject.value;
    }

    /**
     * Força verificação de atualização
     */
    async checkForUpdate(): Promise<boolean> {
        if (!this.swUpdate.isEnabled) {
            return false;
        }

        try {
            return await this.swUpdate.checkForUpdate();
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
            return false;
        }
    }

    /**
     * Obtém informações sobre a qualidade da conexão
     */
    getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
        const status = this.connectivitySubject.value;

        if (!status.isOnline) {
            return 'offline';
        }

        if (!status.effectiveType) {
            return 'good'; // Padrão se não tiver informações
        }

        switch (status.effectiveType) {
            case '4g':
                return 'excellent';
            case '3g':
                return 'good';
            case '2g':
            case 'slow-2g':
                return 'poor';
            default:
                return 'good';
        }
    }

    /**
     * Verifica se deve usar cache agressivo baseado na qualidade da conexão
     */
    shouldUseAggressiveCaching(): boolean {
        const quality = this.getConnectionQuality();
        return quality === 'poor' || quality === 'offline';
    }

    /**
     * Obtém tempo de cache recomendado baseado na qualidade da conexão
     */
    getRecommendedCacheTime(): number {
        const quality = this.getConnectionQuality();

        switch (quality) {
            case 'excellent':
                return 5 * 60 * 1000; // 5 minutos
            case 'good':
                return 10 * 60 * 1000; // 10 minutos
            case 'poor':
                return 30 * 60 * 1000; // 30 minutos
            case 'offline':
                return 24 * 60 * 60 * 1000; // 24 horas
            default:
                return 10 * 60 * 1000; // 10 minutos
        }
    }

    /**
     * Registra Service Worker manualmente se necessário
     */
    async registerServiceWorker(): Promise<boolean> {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker não é suportado neste navegador');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.register('/ngsw-worker.js');
            console.log('Service Worker registrado com sucesso:', registration);
            return true;
        } catch (error) {
            console.error('Erro ao registrar Service Worker:', error);
            return false;
        }
    }

    /**
     * Limpa cache do Service Worker
     */
    async clearCache(): Promise<void> {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('Cache do Service Worker limpo');
        }
    }

    /**
     * Obtém estatísticas de uso do cache
     */
    async getCacheStats(): Promise<{ size: number; entries: number }> {
        if (!('caches' in window)) {
            return { size: 0, entries: 0 };
        }

        try {
            const cacheNames = await caches.keys();
            let totalSize = 0;
            let totalEntries = 0;

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                totalEntries += keys.length;

                // Estimar tamanho (aproximado)
                for (const request of keys) {
                    const response = await cache.match(request);
                    if (response) {
                        const blob = await response.blob();
                        totalSize += blob.size;
                    }
                }
            }

            return { size: totalSize, entries: totalEntries };
        } catch (error) {
            console.error('Erro ao obter estatísticas do cache:', error);
            return { size: 0, entries: 0 };
        }
    }
}