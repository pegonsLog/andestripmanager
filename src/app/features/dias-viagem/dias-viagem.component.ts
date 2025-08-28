import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';

import { DiaViagem } from '../../models';
import { DiasViagemService } from '../../services/dias-viagem.service';
import { DiaViagemCardComponent } from './dia-viagem-card/dia-viagem-card.component';

/**
 * Componente para exibir timeline de dias de viagem
 * Permite visualizar, reordenar e gerenciar os dias de uma viagem
 */
@Component({
    selector: 'app-dias-viagem',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatTooltipModule,
        DragDropModule,
        DiaViagemCardComponent
    ],
    templateUrl: './dias-viagem.component.html',
    styleUrls: ['./dias-viagem.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiasViagemComponent implements OnInit, OnDestroy {
    @Input() viagemId!: string;

    // Serviços injetados
    private diasViagemService = inject(DiasViagemService);

    // Controle de ciclo de vida
    private destroy$ = new Subject<void>();

    // Estado do componente
    isLoading$ = new BehaviorSubject<boolean>(false);
    dias$ = new BehaviorSubject<DiaViagem[]>([]);

    // Totais calculados
    totais$ = this.dias$.pipe(
        map(dias => this.calcularTotais(dias))
    );

    ngOnInit(): void {
        if (!this.viagemId) {
            console.error('viagemId é obrigatório para DiasViagemComponent');
            return;
        }

        this.carregarDias();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega os dias da viagem
     */
    private carregarDias(): void {
        this.isLoading$.next(true);

        this.diasViagemService.listarDiasViagem(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dias) => {
                    this.dias$.next(dias);
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar dias da viagem:', error);
                    this.isLoading$.next(false);
                }
            });
    }

    /**
     * Manipula o drop de reordenação dos dias
     */
    onDrop(event: CdkDragDrop<DiaViagem[]>): void {
        const dias = [...this.dias$.value];

        if (event.previousIndex !== event.currentIndex) {
            moveItemInArray(dias, event.previousIndex, event.currentIndex);

            // Atualizar números dos dias
            const diasAtualizados = dias.map((dia, index) => ({
                ...dia,
                numeroDia: index + 1
            }));

            this.dias$.next(diasAtualizados);
            this.salvarOrdemDias(diasAtualizados);
        }
    }

    /**
     * Salva a nova ordem dos dias no banco
     */
    private async salvarOrdemDias(dias: DiaViagem[]): Promise<void> {
        try {
            const promises = dias.map(dia =>
                this.diasViagemService.altera(dia.id!, { numeroDia: dia.numeroDia })
            );

            await Promise.all(promises);
            console.log('Ordem dos dias atualizada com sucesso');
        } catch (error) {
            console.error('Erro ao salvar ordem dos dias:', error);
            // Recarregar dados em caso de erro
            this.carregarDias();
        }
    }

    /**
     * Calcula totais da viagem
     */
    private calcularTotais(dias: DiaViagem[]) {
        return {
            totalDias: dias.length,
            distanciaTotal: dias.reduce((total, dia) => total + (dia.distanciaPlanejada || 0), 0),
            distanciaPercorrida: dias.reduce((total, dia) => total + (dia.distanciaPercorrida || 0), 0),
            tempoEstimadoTotal: dias.reduce((total, dia) => total + (dia.rota?.tempoEstimado || 0), 0),
            tempoRealTotal: dias.reduce((total, dia) => total + (dia.rota?.tempoReal || 0), 0)
        };
    }

    /**
     * Adiciona novo dia à viagem
     */
    onAdicionarDia(): void {
        // Implementar navegação para formulário de novo dia
        console.log('Adicionar novo dia');
    }

    /**
     * Edita um dia específico
     */
    onEditarDia(dia: DiaViagem): void {
        console.log('Editar dia:', dia);
    }

    /**
     * Visualiza detalhes de um dia
     */
    onVisualizarDia(dia: DiaViagem): void {
        console.log('Visualizar dia:', dia);
    }

    /**
     * Remove um dia da viagem
     */
    async onRemoverDia(dia: DiaViagem): Promise<void> {
        if (confirm(`Tem certeza que deseja remover o dia ${dia.numeroDia}?`)) {
            try {
                await this.diasViagemService.remove(dia.id!);
                this.carregarDias(); // Recarregar lista
            } catch (error) {
                console.error('Erro ao remover dia:', error);
            }
        }
    }

    /**
     * Formata tempo em minutos para horas e minutos
     */
    formatarTempo(minutos: number): string {
        if (!minutos) return '0h 0min';

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        return `${horas}h ${mins}min`;
    }

    /**
     * Formata distância em km
     */
    formatarDistancia(km: number): string {
        return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
    }

    /**
     * TrackBy function para otimizar renderização da lista
     */
    trackByDiaId(index: number, dia: DiaViagem): string {
        return dia.id || index.toString();
    }
}