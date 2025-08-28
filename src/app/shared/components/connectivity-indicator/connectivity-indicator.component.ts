import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PwaService, ConnectivityStatus } from '../../../core/services/pwa.service';
import { OfflineService } from '../../../core/services/offline.service';

@Component({
    selector: 'app-connectivity-indicator',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatTooltipModule,
        MatChipsModule
    ],
    templateUrl: './connectivity-indicator.component.html',
    styleUrls: ['./connectivity-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectivityIndicatorComponent implements OnInit, OnDestroy {
    connectivity$: Observable<ConnectivityStatus>;
    syncStatus$ = this.offlineService.isOnline$;

    private destroy$ = new Subject<void>();

    constructor(
        private pwaService: PwaService,
        private offlineService: OfflineService
    ) {
        this.connectivity$ = this.pwaService.connectivity$;
    }

    ngOnInit(): void {
        // Componente reativo - não precisa de lógica adicional no OnInit
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Obtém ícone baseado no status de conectividade
     */
    getConnectivityIcon(status: ConnectivityStatus): string {
        if (!status.isOnline) {
            return 'wifi_off';
        }

        const quality = this.pwaService.getConnectionQuality();
        switch (quality) {
            case 'excellent':
                return 'wifi';
            case 'good':
                return 'network_wifi_3_bar';
            case 'poor':
                return 'network_wifi_1_bar';
            default:
                return 'wifi';
        }
    }

    /**
     * Obtém cor baseada no status de conectividade
     */
    getConnectivityColor(status: ConnectivityStatus): string {
        if (!status.isOnline) {
            return 'warn';
        }

        const quality = this.pwaService.getConnectionQuality();
        switch (quality) {
            case 'excellent':
                return 'primary';
            case 'good':
                return 'accent';
            case 'poor':
                return 'warn';
            default:
                return 'primary';
        }
    }

    /**
     * Obtém tooltip com informações detalhadas
     */
    getTooltipText(status: ConnectivityStatus): string {
        if (!status.isOnline) {
            return 'Modo offline - Dados serão sincronizados quando a conexão for restaurada';
        }

        const quality = this.pwaService.getConnectionQuality();
        const syncStatus = this.offlineService.getSyncStatus();

        let tooltip = `Conectado - Qualidade: ${this.getQualityText(quality)}`;

        if (status.effectiveType) {
            tooltip += `\nTipo: ${status.effectiveType.toUpperCase()}`;
        }

        if (status.downlink) {
            tooltip += `\nVelocidade: ${status.downlink} Mbps`;
        }

        if (syncStatus.pendingOperations > 0) {
            tooltip += `\n${syncStatus.pendingOperations} operação(ões) pendente(s)`;
        }

        return tooltip;
    }

    /**
     * Obtém texto da qualidade da conexão
     */
    private getQualityText(quality: string): string {
        switch (quality) {
            case 'excellent':
                return 'Excelente';
            case 'good':
                return 'Boa';
            case 'poor':
                return 'Ruim';
            case 'offline':
                return 'Offline';
            default:
                return 'Desconhecida';
        }
    }

    /**
     * Obtém número de operações pendentes
     */
    getPendingOperationsCount(): number {
        return this.offlineService.getSyncStatus().pendingOperations;
    }

    /**
     * Força sincronização manual
     */
    async forceSync(): Promise<void> {
        try {
            await this.offlineService.forcSync();
        } catch (error) {
            console.error('Erro ao forçar sincronização:', error);
        }
    }
}