import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { ConflictResolutionService, SyncLog } from '../../../core/services/conflict-resolution.service';

@Component({
    selector: 'app-sync-logs',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatChipsModule,
        MatExpansionModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatSelectModule
    ],
    templateUrl: './sync-logs.component.html',
    styleUrls: ['./sync-logs.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncLogsComponent implements OnInit, OnDestroy {
    logs$: Observable<SyncLog[]>;
    filteredLogs$: Observable<SyncLog[]>;

    private destroy$ = new Subject<void>();
    private filterSubject = new BehaviorSubject<{
        operation?: string;
        entityType?: string;
        pageIndex: number;
        pageSize: number;
    }>({
        pageIndex: 0,
        pageSize: 20
    });

    // Opções de filtro
    operationOptions = [
        { value: '', label: 'Todas as operações' },
        { value: 'sync_start', label: 'Início de sincronização' },
        { value: 'sync_complete', label: 'Sincronização completa' },
        { value: 'conflict_detected', label: 'Conflito detectado' },
        { value: 'conflict_resolved', label: 'Conflito resolvido' },
        { value: 'sync_failed', label: 'Falha na sincronização' }
    ];

    entityTypeOptions = [
        { value: '', label: 'Todos os tipos' },
        { value: 'viagem', label: 'Viagens' },
        { value: 'parada', label: 'Paradas' },
        { value: 'hospedagem', label: 'Hospedagens' },
        { value: 'custo', label: 'Custos' },
        { value: 'usuario', label: 'Usuário' }
    ];

    currentFilter = this.filterSubject.value;
    totalLogs = 0;

    constructor(
        private conflictService: ConflictResolutionService
    ) {
        this.logs$ = this.conflictService.syncLogs$;
        this.setupFilteredLogs();
    }

    ngOnInit(): void {
        // Componente reativo - não precisa de lógica adicional no OnInit
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Configura logs filtrados
     */
    private setupFilteredLogs(): void {
        this.filteredLogs$ = combineLatest([
            this.logs$,
            this.filterSubject.asObservable()
        ]).pipe(
            map(([logs, filter]) => {
                let filtered = [...logs];

                // Filtrar por operação
                if (filter.operation) {
                    filtered = filtered.filter(log => log.operation === filter.operation);
                }

                // Filtrar por tipo de entidade
                if (filter.entityType) {
                    filtered = filtered.filter(log => log.entityType === filter.entityType);
                }

                // Ordenar por timestamp (mais recente primeiro)
                filtered.sort((a, b) => b.timestamp - a.timestamp);

                this.totalLogs = filtered.length;

                // Paginação
                const startIndex = filter.pageIndex * filter.pageSize;
                const endIndex = startIndex + filter.pageSize;

                return filtered.slice(startIndex, endIndex);
            }),
            takeUntil(this.destroy$)
        );
    }

    /**
     * Obtém ícone baseado na operação
     */
    getOperationIcon(operation: string): string {
        switch (operation) {
            case 'sync_start':
                return 'sync';
            case 'sync_complete':
                return 'check_circle';
            case 'conflict_detected':
                return 'warning';
            case 'conflict_resolved':
                return 'check';
            case 'sync_failed':
                return 'error';
            default:
                return 'info';
        }
    }

    /**
     * Obtém cor baseada na operação
     */
    getOperationColor(operation: string): string {
        switch (operation) {
            case 'sync_start':
                return 'primary';
            case 'sync_complete':
                return 'accent';
            case 'conflict_detected':
                return 'warn';
            case 'conflict_resolved':
                return 'accent';
            case 'sync_failed':
                return 'warn';
            default:
                return 'primary';
        }
    }

    /**
     * Obtém texto da operação
     */
    getOperationText(operation: string): string {
        const option = this.operationOptions.find(opt => opt.value === operation);
        return option ? option.label : operation;
    }

    /**
     * Formata timestamp
     */
    formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleString('pt-BR');
    }

    /**
     * Formata duração
     */
    formatDuration(duration?: number): string {
        if (!duration) return 'N/A';

        if (duration < 1000) {
            return `${duration}ms`;
        }

        return `${(duration / 1000).toFixed(1)}s`;
    }

    /**
     * Formata detalhes do log
     */
    formatDetails(details: any): string {
        if (!details || Object.keys(details).length === 0) {
            return 'Nenhum detalhe disponível';
        }

        return JSON.stringify(details, null, 2);
    }

    /**
     * Aplica filtro de operação
     */
    onOperationFilterChange(operation: string): void {
        this.currentFilter = {
            ...this.currentFilter,
            operation: operation || undefined,
            pageIndex: 0 // Reset para primeira página
        };
        this.filterSubject.next(this.currentFilter);
    }

    /**
     * Aplica filtro de tipo de entidade
     */
    onEntityTypeFilterChange(entityType: string): void {
        this.currentFilter = {
            ...this.currentFilter,
            entityType: entityType || undefined,
            pageIndex: 0 // Reset para primeira página
        };
        this.filterSubject.next(this.currentFilter);
    }

    /**
     * Manipula mudança de página
     */
    onPageChange(event: PageEvent): void {
        this.currentFilter = {
            ...this.currentFilter,
            pageIndex: event.pageIndex,
            pageSize: event.pageSize
        };
        this.filterSubject.next(this.currentFilter);
    }

    /**
     * Limpa todos os filtros
     */
    clearFilters(): void {
        this.currentFilter = {
            pageIndex: 0,
            pageSize: 20
        };
        this.filterSubject.next(this.currentFilter);
    }

    /**
     * Exporta logs como JSON
     */
    exportLogs(): void {
        this.logs$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(logs => {
            const dataStr = JSON.stringify(logs, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `sync-logs-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            URL.revokeObjectURL(link.href);
        });
    }

    /**
     * Limpa logs antigos
     */
    clearOldLogs(): void {
        // Implementar lógica para limpar logs antigos
        // Por enquanto, apenas simular
        console.log('Limpando logs antigos...');
    }

    /**
     * Obtém estatísticas dos logs
     */
    getLogStats(): Observable<{
        total: number;
        byOperation: { [key: string]: number };
        byEntityType: { [key: string]: number };
        recentErrors: number;
    }> {
        return this.logs$.pipe(
            map(logs => {
                const stats = {
                    total: logs.length,
                    byOperation: {} as { [key: string]: number },
                    byEntityType: {} as { [key: string]: number },
                    recentErrors: 0
                };

                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

                logs.forEach(log => {
                    // Por operação
                    stats.byOperation[log.operation] = (stats.byOperation[log.operation] || 0) + 1;

                    // Por tipo de entidade
                    if (log.entityType) {
                        stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
                    }

                    // Erros recentes
                    if (log.operation === 'sync_failed' && log.timestamp > oneDayAgo) {
                        stats.recentErrors++;
                    }
                });

                return stats;
            })
        );
    }

    /**
     * Verifica se há detalhes para mostrar
     */
    hasDetails(details: any): boolean {
        return details && Object.keys(details).length > 0;
    }

    /**
     * Obtém resumo do log
     */
    getLogSummary(log: SyncLog): string {
        let summary = this.getOperationText(log.operation);

        if (log.entityType) {
            summary += ` - ${log.entityType}`;
        }

        if (log.entityId) {
            summary += ` (${log.entityId.substring(0, 8)}...)`;
        }

        if (log.duration) {
            summary += ` - ${this.formatDuration(log.duration)}`;
        }

        return summary;
    }

    /**
     * TrackBy function para otimizar renderização da lista
     */
    trackByLogId(index: number, log: SyncLog): string {
        return log.id;
    }
}