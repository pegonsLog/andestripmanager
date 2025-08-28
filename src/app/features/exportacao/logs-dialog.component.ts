import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { ErrorHandlerService, LogOperacao } from './error-handler.service';

@Component({
    selector: 'app-logs-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatChipsModule,
        MatCardModule,
        MatTabsModule,
        MatDividerModule
    ],
    templateUrl: './logs-dialog.component.html',
    styleUrls: ['./logs-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogsDialogComponent implements OnInit {
    logs: LogOperacao[] = [];
    estatisticas: any = {};
    displayedColumns: string[] = ['timestamp', 'operacao', 'status', 'tentativa', 'tempoExecucao', 'acoes'];

    constructor(
        private errorHandler: ErrorHandlerService,
        private dialogRef: MatDialogRef<LogsDialogComponent>
    ) { }

    ngOnInit(): void {
        this.carregarLogs();
        this.carregarEstatisticas();
    }

    /**
     * Carrega logs de operações
     */
    private carregarLogs(): void {
        this.logs = this.errorHandler.obterLogs({ limite: 100 });
    }

    /**
     * Carrega estatísticas dos logs
     */
    private carregarEstatisticas(): void {
        this.estatisticas = this.errorHandler.obterEstatisticasLogs();
    }

    /**
     * Obtém cor do chip de status
     */
    getCorStatus(status: string): string {
        switch (status) {
            case 'sucesso':
                return 'primary';
            case 'erro':
                return 'warn';
            case 'retry':
                return 'accent';
            case 'iniciado':
                return '';
            default:
                return '';
        }
    }

    /**
     * Formata timestamp
     */
    formatarTimestamp(timestamp: string): string {
        try {
            return new Date(timestamp).toLocaleString('pt-BR');
        } catch {
            return timestamp;
        }
    }

    /**
     * Formata tempo de execução
     */
    formatarTempoExecucao(tempo?: number): string {
        if (!tempo) return '-';

        if (tempo < 1000) {
            return `${tempo}ms`;
        } else {
            return `${(tempo / 1000).toFixed(1)}s`;
        }
    }

    /**
     * Obtém operações mais comuns
     */
    get operacoesMaisComuns(): Array<{ operacao: string; count: number }> {
        return Object.entries(this.estatisticas.operacoesMaisComuns || {})
            .map(([operacao, count]) => ({ operacao, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    /**
     * Obtém erros mais comuns
     */
    get errosMaisComuns(): Array<{ erro: string; count: number }> {
        return Object.entries(this.estatisticas.errosMaisComuns || {})
            .map(([erro, count]) => ({ erro, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    /**
     * Exporta logs
     */
    exportarLogs(): void {
        const dadosLogs = this.errorHandler.exportarLogs();
        const blob = new Blob([dadosLogs], { type: 'application/json' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs_operacoes_${new Date().toISOString().split('T')[0]}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
    }

    /**
     * Limpa logs
     */
    limparLogs(): void {
        this.errorHandler.limparLogs();
        this.carregarLogs();
        this.carregarEstatisticas();
    }

    /**
     * Fecha dialog
     */
    fechar(): void {
        this.dialogRef.close();
    }
}