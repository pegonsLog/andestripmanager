import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';

import { ClimaCardComponent } from '../clima-card/clima-card.component';
import { Clima, PrevisaoTempo } from '../../../../models/clima.interface';
import { DiaViagem } from '../../../../models/dia-viagem.interface';
import { ClimaService } from '../../../../services/clima.service';
import { DiasViagemService } from '../../../../services/dias-viagem.service';

/**
 * Componente para exibir clima da viagem
 */
@Component({
    selector: 'app-clima-viagem',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        ClimaCardComponent
    ],
    templateUrl: './clima-viagem.component.html',
    styleUrls: ['./clima-viagem.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClimaViagemComponent implements OnInit, OnDestroy {
    @Input() viagemId!: string;

    private climaService = inject(ClimaService);
    private diasViagemService = inject(DiasViagemService);
    private snackBar = inject(MatSnackBar);
    private destroy$ = new Subject<void>();

    // Signals
    isLoading = signal<boolean>(false);
    diasViagem = signal<DiaViagem[]>([]);
    climaPorDia = signal<Map<string, Clima>>(new Map());
    previsoesPorDia = signal<Map<string, PrevisaoTempo>>(new Map());
    erro = signal<string | null>(null);

    ngOnInit(): void {
        this.carregarDados();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega dados da viagem e clima (público para poder ser chamado do template)
     */
    carregarDados(): void {
        this.isLoading.set(true);
        this.erro.set(null);

        this.diasViagemService.listarDiasViagem(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dias) => {
                    this.diasViagem.set(dias);
                    if (dias.length > 0) {
                        this.carregarClimaDias(dias);
                    } else {
                        this.isLoading.set(false);
                    }
                },
                error: (error) => {
                    console.error('Erro ao carregar dias da viagem:', error);
                    this.erro.set('Erro ao carregar dias da viagem');
                    this.isLoading.set(false);
                }
            });
    }

    /**
     * Carrega clima para os dias da viagem
     */
    private carregarClimaDias(dias: DiaViagem[]): void {
        const diasIds = dias.map(d => d.id!).filter(id => id);

        this.climaService.recuperarPorViagem(diasIds)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (climas) => {
                    const climaMap = new Map<string, Clima>();
                    climas.forEach(clima => {
                        climaMap.set(clima.diaViagemId, clima);
                    });
                    this.climaPorDia.set(climaMap);
                    this.isLoading.set(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar clima:', error);
                    this.isLoading.set(false);
                }
            });
    }

    /**
     * Atualiza previsão para um dia específico
     */
    async onAtualizarPrevisao(dia: DiaViagem): Promise<void> {
        if (!dia.destino || !dia.id) return;

        this.isLoading.set(true);
        this.erro.set(null);

        try {
            // Buscar coordenadas e previsão usando firstValueFrom para converter Observable em Promise
            const { coords, previsao } = await firstValueFrom(
                this.climaService.buscarCoordenadasCidade(dia.destino).pipe(
                    switchMap(coords => 
                        this.climaService.buscarPrevisaoTempo(coords.lat, coords.lng, dia.destino).pipe(
                            map(previsao => ({ coords, previsao }))
                        )
                    )
                )
            );

            // Salvar previsão no Firestore com as coordenadas corretas
            await this.climaService.salvarClimaDia(
                dia.id!,
                dia.data,
                dia.destino!,
                coords,
                previsao
            );

            // Atualizar mapa local
            const previsoes = this.previsoesPorDia();
            previsoes.set(dia.id!, previsao);
            this.previsoesPorDia.set(new Map(previsoes));

            this.snackBar.open('Previsão atualizada com sucesso!', 'Fechar', { duration: 3000 });
            this.carregarDados(); // Recarregar dados
            this.isLoading.set(false);
        } catch (error) {
            console.error('Erro ao buscar previsão:', error);
            this.erro.set('Erro ao buscar previsão do tempo. Verifique se a API key está configurada.');
            this.snackBar.open('Erro ao buscar previsão do tempo', 'Fechar', { duration: 5000 });
            this.isLoading.set(false);
        }
    }

    /**
     * Atualiza todas as previsões
     */
    async onAtualizarTodasPrevisoes(): Promise<void> {
        const dias = this.diasViagem();
        if (dias.length === 0) {
            this.snackBar.open('Nenhum dia de viagem encontrado', 'Fechar', { duration: 3000 });
            return;
        }

        this.isLoading.set(true);
        this.erro.set(null);
        
        let sucessos = 0;
        let erros = 0;

        this.snackBar.open(`Atualizando ${dias.length} previsões...`, '', { duration: 2000 });

        for (const dia of dias) {
            try {
                await this.onAtualizarPrevisao(dia);
                sucessos++;
            } catch (error) {
                console.error(`Erro ao atualizar previsão do dia ${dia.numeroDia}:`, error);
                erros++;
            }
        }

        this.isLoading.set(false);
        
        // Mensagem de resumo
        if (erros === 0) {
            this.snackBar.open(`✅ Todas as ${sucessos} previsões foram atualizadas!`, 'Fechar', { duration: 5000 });
        } else if (sucessos > 0) {
            this.snackBar.open(`⚠️ ${sucessos} atualizadas, ${erros} com erro`, 'Fechar', { duration: 5000 });
        } else {
            this.snackBar.open(`❌ Erro ao atualizar todas as previsões`, 'Fechar', { duration: 5000 });
        }
    }

    /**
     * Obtém clima para um dia específico
     */
    getClimaDia(diaId: string): Clima | undefined {
        return this.climaPorDia().get(diaId);
    }

    /**
     * Formata data
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
}
