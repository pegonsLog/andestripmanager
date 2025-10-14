import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { ClimaCardComponent } from '../clima-card/clima-card.component';
import { AlertasClimaComponent } from '../alertas-clima/alertas-clima.component';
import { HistoricoClimaComponent } from '../historico-clima/historico-clima.component';
import { ClimaObservadoFormComponent, ClimaObservadoDialogData } from '../clima-observado-form/clima-observado-form.component';

import { ClimaService } from '../../../../services/clima.service';
import { Clima, PrevisaoTempo, ClimaObservado, AlertaClimatico } from '../../../../models/clima.interface';
import { DiaViagem } from '../../../../models/dia-viagem.interface';

@Component({
    selector: 'app-clima-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        ClimaCardComponent,
        AlertasClimaComponent,
        HistoricoClimaComponent
    ],
    templateUrl: './clima-dashboard.component.html',
    styleUrls: ['./clima-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClimaDashboardComponent implements OnInit, OnDestroy {
    @Input() diaViagem?: DiaViagem;
    @Input() diasViagem: DiaViagem[] = [];
    @Input() usuarioId!: string;
    @Input() showHistorico = true;
    @Input() showAlertas = true;

    clima?: Clima;
    previsaoAtual?: PrevisaoTempo;
    alertas: AlertaClimatico[] = [];
    isLoading = false;

    private destroy$ = new Subject<void>();

    constructor(
        private climaService: ClimaService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        if (this.diaViagem) {
            this.carregarClimaDia();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega dados climáticos para o dia atual
     */
    private carregarClimaDia(): void {
        if (!this.diaViagem) return;

        this.isLoading = true;
        this.cdr.detectChanges();

        // Carregar clima existente
        this.climaService.recuperarPorDiaViagem(this.diaViagem.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (climas) => {
                    if (climas && climas.length > 0) {
                        this.clima = climas[0];

                        if (this.clima.previsao) {
                            this.previsaoAtual = this.clima.previsao;
                            this.alertas = this.climaService.gerarAlertas(this.clima.previsao);
                        }
                    } else {
                        // Se não há clima salvo, buscar previsão
                        this.buscarPrevisaoTempo();
                    }

                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('Erro ao carregar clima:', error);
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    /**
     * Busca previsão do tempo para o dia
     */
    private buscarPrevisaoTempo(): void {
        if (!this.diaViagem?.coordenadas?.destino) {
            return;
        }

        const { lat, lng } = this.diaViagem.coordenadas.destino;
        const cidade = this.diaViagem.cidadeDestino;

        this.climaService.buscarPrevisaoTempo(lat, lng, cidade)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (previsao) => {
                    this.previsaoAtual = previsao;
                    this.alertas = this.climaService.gerarAlertas(previsao);

                    // Salvar previsão no banco
                    this.salvarPrevisao(previsao);

                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('Erro ao buscar previsão:', error);
                    this.mostrarMensagem('Não foi possível obter a previsão do tempo', 'error');
                }
            });
    }

    /**
     * Salva a previsão no banco de dados
     */
    private async salvarPrevisao(previsao: PrevisaoTempo): Promise<void> {
        if (!this.diaViagem) return;

        try {
            await this.climaService.salvarClimaDia(
                this.diaViagem.id!,
                this.diaViagem.data,
                this.diaViagem.cidadeDestino,
                this.diaViagem.coordenadas?.destino || { lat: 0, lng: 0 },
                previsao
            );
            previsao;
        } catch (error) {
            console.error('Erro ao salvar previsão:', error);
        }
    }

    /**
     * Atualiza a previsão do tempo
     */
    onAtualizarPrevisao(): void {
        this.buscarPrevisaoTempo();
        this.mostrarMensagem('Atualizando previsão do tempo...', 'info');
    }

    /**
     * Abre o formulário para registrar clima observado
     */
    onRegistrarObservado(): void {
        if (!this.diaViagem) return;

        const dialogData: ClimaObservadoDialogData = {
            diaViagemId: this.diaViagem.id!,
            data: this.diaViagem.data,
            climaExistente: this.clima?.observado
        };

        const dialogRef = this.dialog.open(ClimaObservadoFormComponent, {
            width: '500px',
            data: dialogData,
            disableClose: true
        });

        dialogRef.afterClosed().subscribe((climaObservado: ClimaObservado) => {
            if (climaObservado) {
                this.salvarClimaObservado(climaObservado);
            }
        });
    }

    /**
     * Salva o clima observado
     */
    private async salvarClimaObservado(climaObservado: ClimaObservado): Promise<void> {
        if (!this.diaViagem) return;

        try {
            await this.climaService.registrarClimaObservado(
                this.diaViagem.id!,
                climaObservado
            );

            // Recarregar dados
            this.carregarClimaDia();

            this.mostrarMensagem('Clima observado registrado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar clima observado:', error);
            this.mostrarMensagem('Erro ao registrar clima observado', 'error');
        }
    }

    /**
     * Obtém IDs dos dias de viagem para o histórico
     */
    obterDiasViagemIds(): string[] {
        return this.diasViagem
            .filter(dia => dia.id)
            .map(dia => dia.id!);
    }

    /**
     * Verifica se tem dados climáticos
     */
    temDadosClimaticos(): boolean {
        return !!(this.clima || this.previsaoAtual);
    }

    /**
     * Verifica se está carregando
     */
    estaCarregando(): boolean {
        return this.isLoading;
    }

    /**
     * Mostra mensagem para o usuário
     */
    private mostrarMensagem(mensagem: string, tipo: 'success' | 'error' | 'info'): void {
        const config = {
            duration: 4000,
            panelClass: [`snackbar-${tipo}`]
        };

        this.snackBar.open(mensagem, 'Fechar', config);
    }
}