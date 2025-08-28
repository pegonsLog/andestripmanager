import { Injectable } from '@angular/core';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';

import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';
import { Viagem } from '../../models/viagem.interface';
import { Usuario } from '../../models/usuario.interface';

export interface CriticalDataItem<T> {
    data: T;
    lastUpdate: number;
    priority: 'high' | 'medium' | 'low';
    syncStatus: 'synced' | 'pending' | 'failed';
}

@Injectable({
    providedIn: 'root'
})
export class CriticalDataService {
    private readonly CRITICAL_KEYS = {
        USER_PROFILE: 'critical_user_profile',
        ACTIVE_TRIPS: 'critical_active_trips',
        RECENT_TRIPS: 'critical_recent_trips',
        USER_PREFERENCES: 'critical_user_preferences',
        OFFLINE_MAPS: 'critical_offline_maps'
    };

    private criticalDataStatus = new BehaviorSubject<{ [key: string]: CriticalDataItem<any> }>({});
    public criticalDataStatus$ = this.criticalDataStatus.asObservable();

    constructor(
        private cacheService: CacheService,
        private offlineService: OfflineService
    ) {
        this.initCriticalDataMonitoring();
    }

    /**
     * Inicializa monitoramento de dados críticos
     */
    private initCriticalDataMonitoring(): void {
        // Verificar status dos dados críticos periodicamente
        setInterval(() => {
            this.updateCriticalDataStatus();
        }, 30000); // A cada 30 segundos

        // Atualizar status inicial
        this.updateCriticalDataStatus();
    }

    /**
     * Atualiza status dos dados críticos
     */
    private updateCriticalDataStatus(): void {
        const status: { [key: string]: CriticalDataItem<any> } = {};

        Object.values(this.CRITICAL_KEYS).forEach(key => {
            const data = this.offlineService.getCriticalData(key);
            if (data) {
                status[key] = {
                    data,
                    lastUpdate: Date.now(), // Seria obtido dos metadados reais
                    priority: this.getCriticalDataPriority(key),
                    syncStatus: 'synced' // Seria verificado com o servidor
                };
            }
        });

        this.criticalDataStatus.next(status);
    }

    /**
     * Obtém prioridade de um tipo de dado crítico
     */
    private getCriticalDataPriority(key: string): 'high' | 'medium' | 'low' {
        switch (key) {
            case this.CRITICAL_KEYS.USER_PROFILE:
                return 'high';
            case this.CRITICAL_KEYS.ACTIVE_TRIPS:
                return 'high';
            case this.CRITICAL_KEYS.RECENT_TRIPS:
                return 'medium';
            case this.CRITICAL_KEYS.USER_PREFERENCES:
                return 'medium';
            case this.CRITICAL_KEYS.OFFLINE_MAPS:
                return 'low';
            default:
                return 'low';
        }
    }

    /**
     * Armazena perfil do usuário como dado crítico
     */
    storeUserProfile(usuario: Usuario): void {
        this.offlineService.storeCriticalData(this.CRITICAL_KEYS.USER_PROFILE, usuario);
        this.updateCriticalDataStatus();
    }

    /**
     * Recupera perfil do usuário dos dados críticos
     */
    getUserProfile(): Usuario | null {
        return this.offlineService.getCriticalData<Usuario>(this.CRITICAL_KEYS.USER_PROFILE);
    }

    /**
     * Armazena viagens ativas como dados críticos
     */
    storeActiveTrips(viagens: Viagem[]): void {
        const activeTrips = viagens.filter(v =>
            v.status === 'em-andamento' || v.status === 'planejada'
        );

        this.offlineService.storeCriticalData(this.CRITICAL_KEYS.ACTIVE_TRIPS, activeTrips);
        this.updateCriticalDataStatus();
    }

    /**
     * Recupera viagens ativas dos dados críticos
     */
    getActiveTrips(): Viagem[] | null {
        return this.offlineService.getCriticalData<Viagem[]>(this.CRITICAL_KEYS.ACTIVE_TRIPS);
    }

    /**
     * Armazena viagens recentes como dados críticos
     */
    storeRecentTrips(viagens: Viagem[]): void {
        // Manter apenas as 10 viagens mais recentes
        const recentTrips = viagens
            .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
            .slice(0, 10);

        this.offlineService.storeCriticalData(this.CRITICAL_KEYS.RECENT_TRIPS, recentTrips);
        this.updateCriticalDataStatus();
    }

    /**
     * Recupera viagens recentes dos dados críticos
     */
    getRecentTrips(): Viagem[] | null {
        return this.offlineService.getCriticalData<Viagem[]>(this.CRITICAL_KEYS.RECENT_TRIPS);
    }

    /**
     * Armazena preferências do usuário
     */
    storeUserPreferences(preferences: any): void {
        this.offlineService.storeCriticalData(this.CRITICAL_KEYS.USER_PREFERENCES, preferences);
        this.updateCriticalDataStatus();
    }

    /**
     * Recupera preferências do usuário
     */
    getUserPreferences(): any | null {
        return this.offlineService.getCriticalData(this.CRITICAL_KEYS.USER_PREFERENCES);
    }

    /**
     * Verifica se dados críticos estão disponíveis
     */
    hasCriticalData(): boolean {
        return this.getUserProfile() !== null ||
            this.getActiveTrips() !== null ||
            this.getRecentTrips() !== null;
    }

    /**
     * Obtém dados com fallback para dados críticos
     */
    getDataWithCriticalFallback<T>(
        key: string,
        networkFactory: () => Observable<T>,
        criticalKey?: string
    ): Observable<T> {
        return this.cacheService.getOrSet(key, networkFactory, this.cacheService.strategies.NORMAL).pipe(
            catchError(error => {
                console.warn(`Erro ao obter dados de ${key}, tentando dados críticos:`, error);

                if (criticalKey) {
                    const criticalData = this.offlineService.getCriticalData<T>(criticalKey);
                    if (criticalData !== null) {
                        console.log(`Usando dados críticos para ${key}`);
                        return of(criticalData);
                    }
                }

                return throwError(() => error);
            })
        );
    }

    /**
     * Pré-carrega dados críticos essenciais
     */
    preloadCriticalData(): Observable<boolean> {
        return new Observable(observer => {
            const loadPromises: Promise<any>[] = [];

            // Aqui seriam implementadas as chamadas reais para carregar dados críticos
            // Por enquanto, simular carregamento
            loadPromises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        console.log('Dados críticos pré-carregados');
                        resolve(true);
                    }, 1000);
                })
            );

            Promise.all(loadPromises)
                .then(() => {
                    observer.next(true);
                    observer.complete();
                })
                .catch(error => {
                    console.error('Erro ao pré-carregar dados críticos:', error);
                    observer.next(false);
                    observer.complete();
                });
        });
    }

    /**
     * Limpa dados críticos antigos
     */
    cleanupCriticalData(): { removed: number; errors: number } {
        let removed = 0;
        let errors = 0;

        try {
            // Limpar dados críticos com mais de 30 dias
            const maxAge = 30 * 24 * 60 * 60 * 1000;
            removed = this.offlineService.cleanOldCriticalData(maxAge);
        } catch (error) {
            console.error('Erro ao limpar dados críticos:', error);
            errors++;
        }

        return { removed, errors };
    }

    /**
     * Obtém estatísticas dos dados críticos
     */
    getCriticalDataStats(): {
        totalItems: number;
        byPriority: { high: number; medium: number; low: number };
        totalSize: number;
        oldestItem?: number;
    } {
        const status = this.criticalDataStatus.value;
        const stats = {
            totalItems: Object.keys(status).length,
            byPriority: { high: 0, medium: 0, low: 0 },
            totalSize: 0,
            oldestItem: undefined as number | undefined
        };

        let oldestTimestamp = Date.now();

        Object.values(status).forEach(item => {
            stats.byPriority[item.priority]++;

            // Estimar tamanho (seria mais preciso com implementação real)
            try {
                stats.totalSize += new Blob([JSON.stringify(item.data)]).size;
            } catch {
                stats.totalSize += 1024; // Estimativa padrão
            }

            if (item.lastUpdate < oldestTimestamp) {
                oldestTimestamp = item.lastUpdate;
            }
        });

        if (stats.totalItems > 0) {
            stats.oldestItem = Date.now() - oldestTimestamp;
        }

        return stats;
    }

    /**
     * Força sincronização de dados críticos
     */
    async syncCriticalData(): Promise<{ success: number; failed: number }> {
        const results = { success: 0, failed: 0 };

        // Aqui seria implementada a lógica real de sincronização
        // Por enquanto, simular
        return new Promise(resolve => {
            setTimeout(() => {
                results.success = Object.keys(this.criticalDataStatus.value).length;
                console.log('Dados críticos sincronizados:', results);
                resolve(results);
            }, 2000);
        });
    }
}