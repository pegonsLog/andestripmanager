import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface DataConflict<T = any> {
    id: string;
    entityType: string;
    entityId: string;
    conflictType: 'version' | 'concurrent_edit' | 'deleted_modified' | 'field_conflict';
    localData: T;
    remoteData: T;
    baseData?: T; // Versão original antes das modificações
    timestamp: number;
    localTimestamp: number;
    remoteTimestamp: number;
    conflictedFields: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    autoResolvable: boolean;
    suggestedResolution?: ConflictResolution<T>;
}

export interface ConflictResolution<T = any> {
    strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual' | 'create_copy';
    resolvedData: T;
    reasoning: string;
    confidence: number; // 0-1
    requiresUserConfirmation: boolean;
}

export interface ConflictResolutionRule {
    entityType: string;
    fieldName?: string;
    strategy: 'local_wins' | 'remote_wins' | 'merge' | 'latest_timestamp' | 'manual';
    priority: number;
    condition?: (local: any, remote: any, base?: any) => boolean;
}

export interface SyncLog {
    id: string;
    timestamp: number;
    operation: 'sync_start' | 'sync_complete' | 'conflict_detected' | 'conflict_resolved' | 'sync_failed';
    entityType?: string;
    entityId?: string;
    details: any;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ConflictResolutionService {
    private conflictsSubject = new BehaviorSubject<DataConflict[]>([]);
    public conflicts$ = this.conflictsSubject.asObservable();

    private syncLogsSubject = new BehaviorSubject<SyncLog[]>([]);
    public syncLogs$ = this.syncLogsSubject.asObservable();

    private readonly STORAGE_KEY = 'andes_conflicts';
    private readonly LOGS_STORAGE_KEY = 'andes_sync_logs';
    private readonly MAX_LOGS = 1000;

    // Regras padrão de resolução de conflitos
    private defaultRules: ConflictResolutionRule[] = [
        // Regras para viagens
        {
            entityType: 'viagem',
            fieldName: 'status',
            strategy: 'latest_timestamp',
            priority: 1
        },
        {
            entityType: 'viagem',
            fieldName: 'custoTotal',
            strategy: 'merge',
            priority: 2
        },
        {
            entityType: 'viagem',
            strategy: 'manual',
            priority: 3
        },

        // Regras para custos
        {
            entityType: 'custo',
            strategy: 'latest_timestamp',
            priority: 1
        },

        // Regras para paradas
        {
            entityType: 'parada',
            fieldName: 'fotos',
            strategy: 'merge',
            priority: 1
        },
        {
            entityType: 'parada',
            strategy: 'latest_timestamp',
            priority: 2
        },

        // Regras para usuário
        {
            entityType: 'usuario',
            fieldName: 'fotoUrl',
            strategy: 'latest_timestamp',
            priority: 1
        },
        {
            entityType: 'usuario',
            strategy: 'manual',
            priority: 2
        }
    ];

    constructor() {
        this.loadConflicts();
        this.loadSyncLogs();
    }

    /**
     * Carrega conflitos salvos
     */
    private loadConflicts(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const conflicts: DataConflict[] = JSON.parse(stored);
                this.conflictsSubject.next(conflicts);
            }
        } catch (error) {
            console.error('Erro ao carregar conflitos:', error);
        }
    }

    /**
     * Salva conflitos no localStorage
     */
    private saveConflicts(): void {
        try {
            const conflicts = this.conflictsSubject.value;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
        } catch (error) {
            console.error('Erro ao salvar conflitos:', error);
        }
    }

    /**
     * Carrega logs de sincronização
     */
    private loadSyncLogs(): void {
        try {
            const stored = localStorage.getItem(this.LOGS_STORAGE_KEY);
            if (stored) {
                const logs: SyncLog[] = JSON.parse(stored);
                this.syncLogsSubject.next(logs);
            }
        } catch (error) {
            console.error('Erro ao carregar logs de sincronização:', error);
        }
    }

    /**
     * Salva logs de sincronização
     */
    private saveSyncLogs(): void {
        try {
            let logs = this.syncLogsSubject.value;

            // Manter apenas os logs mais recentes
            if (logs.length > this.MAX_LOGS) {
                logs = logs.slice(-this.MAX_LOGS);
            }

            localStorage.setItem(this.LOGS_STORAGE_KEY, JSON.stringify(logs));
            this.syncLogsSubject.next(logs);
        } catch (error) {
            console.error('Erro ao salvar logs de sincronização:', error);
        }
    }

    /**
     * Detecta conflitos entre dados locais e remotos
     */
    detectConflict<T>(
        entityType: string,
        entityId: string,
        localData: T,
        remoteData: T,
        baseData?: T
    ): DataConflict<T> | null {
        // Se os dados são idênticos, não há conflito
        if (this.deepEqual(localData, remoteData)) {
            return null;
        }

        const conflictedFields = this.findConflictedFields(localData, remoteData);

        if (conflictedFields.length === 0) {
            return null;
        }

        const conflictType = this.determineConflictType(localData, remoteData, baseData);
        const severity = this.calculateSeverity(conflictedFields, entityType);
        const suggestedResolution = this.suggestResolution(entityType, localData, remoteData, baseData);

        const conflict: DataConflict<T> = {
            id: this.generateConflictId(),
            entityType,
            entityId,
            conflictType,
            localData,
            remoteData,
            baseData,
            timestamp: Date.now(),
            localTimestamp: this.extractTimestamp(localData),
            remoteTimestamp: this.extractTimestamp(remoteData),
            conflictedFields,
            severity,
            autoResolvable: suggestedResolution?.confidence > 0.8 && !suggestedResolution.requiresUserConfirmation,
            suggestedResolution
        };

        this.addConflict(conflict);
        this.logSyncEvent('conflict_detected', entityType, entityId, { conflictId: conflict.id, severity });

        return conflict;
    }

    /**
     * Compara objetos profundamente
     */
    private deepEqual(obj1: any, obj2: any): boolean {
        if (obj1 === obj2) return true;

        if (obj1 == null || obj2 == null) return obj1 === obj2;

        if (typeof obj1 !== typeof obj2) return false;

        if (typeof obj1 !== 'object') return obj1 === obj2;

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (const key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!this.deepEqual(obj1[key], obj2[key])) return false;
        }

        return true;
    }

    /**
     * Encontra campos em conflito
     */
    private findConflictedFields(local: any, remote: any): string[] {
        const conflicts: string[] = [];

        const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);

        for (const key of allKeys) {
            if (key === 'atualizadoEm' || key === 'criadoEm') continue; // Ignorar timestamps de sistema

            if (!this.deepEqual(local[key], remote[key])) {
                conflicts.push(key);
            }
        }

        return conflicts;
    }

    /**
     * Determina o tipo de conflito
     */
    private determineConflictType(local: any, remote: any, base?: any): DataConflict['conflictType'] {
        if (!local && remote) return 'deleted_modified';
        if (local && !remote) return 'deleted_modified';
        if (base && (!this.deepEqual(local, base) && !this.deepEqual(remote, base))) return 'concurrent_edit';

        return 'field_conflict';
    }

    /**
     * Calcula severidade do conflito
     */
    private calculateSeverity(conflictedFields: string[], entityType: string): DataConflict['severity'] {
        const criticalFields = ['id', 'usuarioId', 'status'];
        const importantFields = ['nome', 'valor', 'data', 'coordenadas'];

        if (conflictedFields.some(field => criticalFields.includes(field))) {
            return 'critical';
        }

        if (conflictedFields.some(field => importantFields.includes(field))) {
            return 'high';
        }

        if (conflictedFields.length > 3) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Sugere resolução automática
     */
    private suggestResolution<T>(
        entityType: string,
        localData: T,
        remoteData: T,
        baseData?: T
    ): ConflictResolution<T> {
        const applicableRules = this.defaultRules
            .filter(rule => rule.entityType === entityType)
            .sort((a, b) => a.priority - b.priority);

        for (const rule of applicableRules) {
            if (rule.condition && !rule.condition(localData, remoteData, baseData)) {
                continue;
            }

            const resolution = this.applyResolutionStrategy(rule.strategy, localData, remoteData, baseData, rule.fieldName);

            if (resolution) {
                return resolution;
            }
        }

        // Fallback para resolução manual
        return {
            strategy: 'manual',
            resolvedData: localData,
            reasoning: 'Conflito complexo que requer intervenção manual',
            confidence: 0,
            requiresUserConfirmation: true
        };
    }

    /**
     * Aplica estratégia de resolução
     */
    private applyResolutionStrategy<T>(
        strategy: ConflictResolutionRule['strategy'],
        localData: T,
        remoteData: T,
        baseData?: T,
        fieldName?: string
    ): ConflictResolution<T> | null {
        switch (strategy) {
            case 'local_wins':
                return {
                    strategy: 'local_wins',
                    resolvedData: localData,
                    reasoning: 'Dados locais têm prioridade',
                    confidence: 0.9,
                    requiresUserConfirmation: false
                };

            case 'remote_wins':
                return {
                    strategy: 'remote_wins',
                    resolvedData: remoteData,
                    reasoning: 'Dados remotos têm prioridade',
                    confidence: 0.9,
                    requiresUserConfirmation: false
                };

            case 'latest_timestamp':
                const localTimestamp = this.extractTimestamp(localData);
                const remoteTimestamp = this.extractTimestamp(remoteData);

                if (localTimestamp && remoteTimestamp) {
                    const winner = localTimestamp > remoteTimestamp ? localData : remoteData;
                    return {
                        strategy: 'latest_timestamp',
                        resolvedData: winner,
                        reasoning: `Usando versão mais recente (${localTimestamp > remoteTimestamp ? 'local' : 'remota'})`,
                        confidence: 0.85,
                        requiresUserConfirmation: false
                    };
                }
                break;

            case 'merge':
                const merged = this.mergeData(localData, remoteData, fieldName);
                if (merged) {
                    return {
                        strategy: 'merge',
                        resolvedData: merged,
                        reasoning: fieldName ? `Campo ${fieldName} mesclado` : 'Dados mesclados automaticamente',
                        confidence: 0.7,
                        requiresUserConfirmation: true
                    };
                }
                break;

            case 'manual':
                return {
                    strategy: 'manual',
                    resolvedData: localData,
                    reasoning: 'Resolução manual necessária',
                    confidence: 0,
                    requiresUserConfirmation: true
                };
        }

        return null;
    }

    /**
     * Mescla dados automaticamente
     */
    private mergeData<T>(localData: T, remoteData: T, fieldName?: string): T | null {
        if (!localData || !remoteData) return null;

        const merged = { ...localData };

        if (fieldName) {
            // Mesclar campo específico
            const localValue = (localData as any)[fieldName];
            const remoteValue = (remoteData as any)[fieldName];

            if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
                // Mesclar arrays (ex: fotos, tags)
                const uniqueItems = [...new Set([...localValue, ...remoteValue])];
                (merged as any)[fieldName] = uniqueItems;
            } else if (typeof localValue === 'number' && typeof remoteValue === 'number') {
                // Para valores numéricos, usar o maior (ex: custoTotal)
                (merged as any)[fieldName] = Math.max(localValue, remoteValue);
            }
        } else {
            // Mesclar objeto completo
            Object.keys(remoteData).forEach(key => {
                if (!(key in localData)) {
                    (merged as any)[key] = (remoteData as any)[key];
                }
            });
        }

        return merged;
    }

    /**
     * Extrai timestamp de um objeto
     */
    private extractTimestamp(data: any): number {
        if (!data) return 0;

        if (data.atualizadoEm) {
            return typeof data.atualizadoEm === 'number' ? data.atualizadoEm : data.atualizadoEm.toMillis?.() || 0;
        }

        if (data.timestamp) {
            return typeof data.timestamp === 'number' ? data.timestamp : data.timestamp.toMillis?.() || 0;
        }

        return 0;
    }

    /**
     * Gera ID único para conflito
     */
    private generateConflictId(): string {
        return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Adiciona conflito à lista
     */
    private addConflict(conflict: DataConflict): void {
        const conflicts = [...this.conflictsSubject.value, conflict];
        this.conflictsSubject.next(conflicts);
        this.saveConflicts();
    }

    /**
     * Resolve conflito
     */
    resolveConflict<T>(conflictId: string, resolution: ConflictResolution<T>): Observable<T> {
        const conflicts = this.conflictsSubject.value;
        const conflict = conflicts.find(c => c.id === conflictId);

        if (!conflict) {
            return throwError(() => new Error('Conflito não encontrado'));
        }

        // Remover conflito da lista
        const updatedConflicts = conflicts.filter(c => c.id !== conflictId);
        this.conflictsSubject.next(updatedConflicts);
        this.saveConflicts();

        // Log da resolução
        this.logSyncEvent('conflict_resolved', conflict.entityType, conflict.entityId, {
            conflictId,
            strategy: resolution.strategy,
            confidence: resolution.confidence
        });

        return of(resolution.resolvedData);
    }

    /**
     * Resolve conflito automaticamente
     */
    autoResolveConflict(conflictId: string): Observable<any> {
        const conflict = this.conflictsSubject.value.find(c => c.id === conflictId);

        if (!conflict) {
            return throwError(() => new Error('Conflito não encontrado'));
        }

        if (!conflict.autoResolvable || !conflict.suggestedResolution) {
            return throwError(() => new Error('Conflito não pode ser resolvido automaticamente'));
        }

        return this.resolveConflict(conflictId, conflict.suggestedResolution);
    }

    /**
     * Obtém conflitos pendentes
     */
    getPendingConflicts(): DataConflict[] {
        return this.conflictsSubject.value;
    }

    /**
     * Obtém conflitos por entidade
     */
    getConflictsByEntity(entityType: string, entityId?: string): DataConflict[] {
        return this.conflictsSubject.value.filter(conflict => {
            if (entityId) {
                return conflict.entityType === entityType && conflict.entityId === entityId;
            }
            return conflict.entityType === entityType;
        });
    }

    /**
     * Limpa conflitos antigos
     */
    cleanupOldConflicts(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
        const now = Date.now();
        const conflicts = this.conflictsSubject.value;
        const oldConflicts = conflicts.filter(conflict => now - conflict.timestamp > maxAge);

        if (oldConflicts.length > 0) {
            const updatedConflicts = conflicts.filter(conflict => now - conflict.timestamp <= maxAge);
            this.conflictsSubject.next(updatedConflicts);
            this.saveConflicts();
        }

        return oldConflicts.length;
    }

    /**
     * Registra evento de sincronização
     */
    logSyncEvent(
        operation: SyncLog['operation'],
        entityType?: string,
        entityId?: string,
        details?: any,
        duration?: number
    ): void {
        const log: SyncLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            operation,
            entityType,
            entityId,
            details: details || {},
            duration
        };

        const logs = [...this.syncLogsSubject.value, log];
        this.syncLogsSubject.next(logs);
        this.saveSyncLogs();
    }

    /**
     * Obtém logs de sincronização
     */
    getSyncLogs(limit?: number): SyncLog[] {
        const logs = this.syncLogsSubject.value;
        return limit ? logs.slice(-limit) : logs;
    }

    /**
     * Obtém estatísticas de conflitos
     */
    getConflictStats(): {
        total: number;
        bySeverity: { [key: string]: number };
        byType: { [key: string]: number };
        byEntity: { [key: string]: number };
        autoResolvable: number;
    } {
        const conflicts = this.conflictsSubject.value;

        const stats = {
            total: conflicts.length,
            bySeverity: {} as { [key: string]: number },
            byType: {} as { [key: string]: number },
            byEntity: {} as { [key: string]: number },
            autoResolvable: 0
        };

        conflicts.forEach(conflict => {
            // Por severidade
            stats.bySeverity[conflict.severity] = (stats.bySeverity[conflict.severity] || 0) + 1;

            // Por tipo
            stats.byType[conflict.conflictType] = (stats.byType[conflict.conflictType] || 0) + 1;

            // Por entidade
            stats.byEntity[conflict.entityType] = (stats.byEntity[conflict.entityType] || 0) + 1;

            // Auto-resolvíveis
            if (conflict.autoResolvable) {
                stats.autoResolvable++;
            }
        });

        return stats;
    }

    /**
     * Resolve todos os conflitos auto-resolvíveis
     */
    autoResolveAllConflicts(): Observable<{ resolved: number; failed: number }> {
        const autoResolvableConflicts = this.conflictsSubject.value.filter(c => c.autoResolvable);

        return new Observable(observer => {
            let resolved = 0;
            let failed = 0;

            const resolveNext = (index: number) => {
                if (index >= autoResolvableConflicts.length) {
                    observer.next({ resolved, failed });
                    observer.complete();
                    return;
                }

                const conflict = autoResolvableConflicts[index];

                this.autoResolveConflict(conflict.id).subscribe({
                    next: () => {
                        resolved++;
                        resolveNext(index + 1);
                    },
                    error: (error) => {
                        console.error(`Erro ao resolver conflito ${conflict.id}:`, error);
                        failed++;
                        resolveNext(index + 1);
                    }
                });
            };

            resolveNext(0);
        });
    }
}