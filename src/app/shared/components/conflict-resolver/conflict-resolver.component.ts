import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataConflict, ConflictResolution, ConflictResolutionService } from '../../../core/services/conflict-resolution.service';

export interface ConflictResolverData {
    conflict: DataConflict;
}

@Component({
    selector: 'app-conflict-resolver',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatRadioModule,
        MatExpansionModule
    ],
    templateUrl: './conflict-resolver.component.html',
    styleUrls: ['./conflict-resolver.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConflictResolverComponent implements OnInit, OnDestroy {
    resolutionForm: FormGroup;
    conflict: DataConflict;

    private destroy$ = new Subject<void>();

    // Opções de resolução
    resolutionOptions = [
        {
            value: 'local_wins',
            label: 'Manter versão local',
            description: 'Usar os dados que estão no seu dispositivo',
            icon: 'smartphone'
        },
        {
            value: 'remote_wins',
            label: 'Usar versão do servidor',
            description: 'Usar os dados mais recentes do servidor',
            icon: 'cloud'
        },
        {
            value: 'merge',
            label: 'Mesclar dados',
            description: 'Combinar informações de ambas as versões',
            icon: 'merge_type'
        },
        {
            value: 'create_copy',
            label: 'Criar cópia',
            description: 'Manter ambas as versões como itens separados',
            icon: 'content_copy'
        }
    ];

    constructor(
        private fb: FormBuilder,
        private conflictService: ConflictResolutionService,
        private dialogRef: MatDialogRef<ConflictResolverComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConflictResolverData
    ) {
        this.conflict = data.conflict;
        this.resolutionForm = this.createForm();
    }

    ngOnInit(): void {
        // Se há uma resolução sugerida, pré-selecionar
        if (this.conflict.suggestedResolution) {
            this.resolutionForm.patchValue({
                strategy: this.conflict.suggestedResolution.strategy
            });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Cria formulário de resolução
     */
    private createForm(): FormGroup {
        return this.fb.group({
            strategy: ['local_wins']
        });
    }

    /**
     * Obtém ícone baseado na severidade
     */
    getSeverityIcon(): string {
        switch (this.conflict.severity) {
            case 'critical':
                return 'error';
            case 'high':
                return 'warning';
            case 'medium':
                return 'info';
            case 'low':
                return 'help_outline';
            default:
                return 'help_outline';
        }
    }

    /**
     * Obtém cor baseada na severidade
     */
    getSeverityColor(): string {
        switch (this.conflict.severity) {
            case 'critical':
                return 'warn';
            case 'high':
                return 'warn';
            case 'medium':
                return 'accent';
            case 'low':
                return 'primary';
            default:
                return 'primary';
        }
    }

    /**
     * Obtém texto da severidade
     */
    getSeverityText(): string {
        switch (this.conflict.severity) {
            case 'critical':
                return 'Crítico';
            case 'high':
                return 'Alto';
            case 'medium':
                return 'Médio';
            case 'low':
                return 'Baixo';
            default:
                return 'Desconhecido';
        }
    }

    /**
     * Obtém texto do tipo de conflito
     */
    getConflictTypeText(): string {
        switch (this.conflict.conflictType) {
            case 'version':
                return 'Conflito de versão';
            case 'concurrent_edit':
                return 'Edição simultânea';
            case 'deleted_modified':
                return 'Item excluído e modificado';
            case 'field_conflict':
                return 'Conflito de campos';
            default:
                return 'Tipo desconhecido';
        }
    }

    /**
     * Formata valor para exibição
     */
    formatValue(value: any): string {
        if (value === null || value === undefined) {
            return 'Não definido';
        }

        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return `Array (${value.length} itens)`;
            }
            return JSON.stringify(value, null, 2);
        }

        if (typeof value === 'boolean') {
            return value ? 'Sim' : 'Não';
        }

        if (typeof value === 'number') {
            // Se parece com timestamp
            if (value > 1000000000000) {
                return new Date(value).toLocaleString('pt-BR');
            }
            return value.toLocaleString('pt-BR');
        }

        return String(value);
    }

    /**
     * Verifica se um campo está em conflito
     */
    isFieldInConflict(fieldName: string): boolean {
        return this.conflict.conflictedFields.includes(fieldName);
    }

    /**
     * Obtém todos os campos únicos
     */
    getAllFields(): string[] {
        const localFields = Object.keys(this.conflict.localData || {});
        const remoteFields = Object.keys(this.conflict.remoteData || {});
        return [...new Set([...localFields, ...remoteFields])].sort();
    }

    /**
     * Obtém valor de um campo nos dados locais
     */
    getLocalValue(fieldName: string): any {
        return this.conflict.localData?.[fieldName];
    }

    /**
     * Obtém valor de um campo nos dados remotos
     */
    getRemoteValue(fieldName: string): any {
        return this.conflict.remoteData?.[fieldName];
    }

    /**
     * Verifica se a estratégia está disponível
     */
    isStrategyAvailable(strategy: string): boolean {
        switch (strategy) {
            case 'merge':
                // Merge só está disponível se há campos que podem ser mesclados
                return this.conflict.conflictedFields.some(field => {
                    const localValue = this.getLocalValue(field);
                    const remoteValue = this.getRemoteValue(field);
                    return Array.isArray(localValue) || Array.isArray(remoteValue) ||
                        typeof localValue === 'number' || typeof remoteValue === 'number';
                });
            case 'create_copy':
                // Criar cópia só faz sentido para certas entidades
                return ['viagem', 'parada', 'hospedagem'].includes(this.conflict.entityType);
            default:
                return true;
        }
    }

    /**
     * Aplica resolução automática sugerida
     */
    applySuggestedResolution(): void {
        if (!this.conflict.suggestedResolution) {
            return;
        }

        const resolution: ConflictResolution = {
            ...this.conflict.suggestedResolution,
            requiresUserConfirmation: false
        };

        this.dialogRef.close(resolution);
    }

    /**
     * Resolve conflito com estratégia selecionada
     */
    resolveConflict(): void {
        const strategy = this.resolutionForm.value.strategy;
        let resolvedData: any;
        let reasoning: string;

        switch (strategy) {
            case 'local_wins':
                resolvedData = this.conflict.localData;
                reasoning = 'Usuário escolheu manter a versão local';
                break;

            case 'remote_wins':
                resolvedData = this.conflict.remoteData;
                reasoning = 'Usuário escolheu usar a versão do servidor';
                break;

            case 'merge':
                resolvedData = this.mergeData();
                reasoning = 'Usuário escolheu mesclar os dados';
                break;

            case 'create_copy':
                // Para criar cópia, retornamos ambos os dados
                resolvedData = {
                    original: this.conflict.remoteData,
                    copy: { ...this.conflict.localData, nome: `${this.conflict.localData.nome} (Cópia)` }
                };
                reasoning = 'Usuário escolheu criar uma cópia';
                break;

            default:
                resolvedData = this.conflict.localData;
                reasoning = 'Resolução padrão aplicada';
        }

        const resolution: ConflictResolution = {
            strategy: strategy as any,
            resolvedData,
            reasoning,
            confidence: 1.0, // Resolução manual tem confiança máxima
            requiresUserConfirmation: false
        };

        this.dialogRef.close(resolution);
    }

    /**
     * Mescla dados automaticamente
     */
    private mergeData(): any {
        const merged = { ...this.conflict.localData };

        this.conflict.conflictedFields.forEach(field => {
            const localValue = this.getLocalValue(field);
            const remoteValue = this.getRemoteValue(field);

            if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
                // Mesclar arrays
                merged[field] = [...new Set([...localValue, ...remoteValue])];
            } else if (typeof localValue === 'number' && typeof remoteValue === 'number') {
                // Para números, usar o maior
                merged[field] = Math.max(localValue, remoteValue);
            } else if (localValue && !remoteValue) {
                merged[field] = localValue;
            } else if (!localValue && remoteValue) {
                merged[field] = remoteValue;
            } else {
                // Para outros tipos, manter o local por padrão
                merged[field] = localValue;
            }
        });

        return merged;
    }

    /**
     * Cancela resolução
     */
    cancel(): void {
        this.dialogRef.close(null);
    }

    /**
     * Obtém preview da resolução
     */
    getResolutionPreview(): any {
        const strategy = this.resolutionForm.value.strategy;

        switch (strategy) {
            case 'local_wins':
                return this.conflict.localData;
            case 'remote_wins':
                return this.conflict.remoteData;
            case 'merge':
                return this.mergeData();
            case 'create_copy':
                return {
                    original: this.conflict.remoteData,
                    copy: { ...this.conflict.localData, nome: `${this.conflict.localData.nome} (Cópia)` }
                };
            default:
                return this.conflict.localData;
        }
    }

    /**
     * Formata timestamp
     */
    formatTimestamp(timestamp: number): string {
        if (!timestamp) return 'Não disponível';
        return new Date(timestamp).toLocaleString('pt-BR');
    }
}