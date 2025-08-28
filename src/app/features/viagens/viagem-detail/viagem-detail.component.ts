import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { takeUntil, switchMap, tap, catchError } from 'rxjs/operators';

// Angular Material
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

// Models e Services
import { Viagem, StatusViagem, DiaViagem, Parada, Hospedagem, Custo, TipoParada, CategoriaCusto } from '../../../models';
import { ViagensService } from '../../../services/viagens.service';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { ParadasService } from '../../../services/paradas.service';
import { HospedagensService } from '../../../services/hospedagens.service';
import { CustosService } from '../../../services/custos.service';

// Componentes
import { ViagemFormComponent } from '../viagem-form/viagem-form.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components';

@Component({
    selector: 'app-viagem-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDialogModule,
        MatChipsModule,
        MatTooltipModule,
        MatDividerModule,
        ViagemFormComponent
    ],
    templateUrl: './viagem-detail.component.html',
    styleUrls: ['./viagem-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViagemDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private viagensService = inject(ViagensService);
    private diasViagemService = inject(DiasViagemService);
    private paradasService = inject(ParadasService);
    private hospedagensService = inject(HospedagensService);
    private custosService = inject(CustosService);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);
    private destroy$ = new Subject<void>();

    // Signals para estado reativo
    viagem = signal<Viagem | null>(null);
    isLoading = signal<boolean>(true);
    selectedTabIndex = signal<number>(0);
    isEditMode = signal<boolean>(false);
    isLoadingRelatedData = signal<boolean>(false);

    // Observables
    viagem$ = new BehaviorSubject<Viagem | null>(null);

    // Dados relacionados
    diasViagem = signal<DiaViagem[]>([]);
    paradas = signal<Parada[]>([]);
    hospedagens = signal<Hospedagem[]>([]);
    custos = signal<Custo[]>([]);

    // Estatísticas calculadas
    estatisticas = signal<{
        totalDias: number;
        totalParadas: number;
        totalHospedagens: number;
        custoTotal: number;
        distanciaTotal: number;
    }>({
        totalDias: 0,
        totalParadas: 0,
        totalHospedagens: 0,
        custoTotal: 0,
        distanciaTotal: 0
    });

    // Enums para template
    readonly StatusViagem = StatusViagem;

    // Configuração das abas
    readonly tabs = [
        { label: 'Resumo', icon: 'info', route: 'resumo' },
        { label: 'Dias', icon: 'calendar_today', route: 'dias' },
        { label: 'Paradas', icon: 'place', route: 'paradas' },
        { label: 'Hospedagens', icon: 'hotel', route: 'hospedagens' },
        { label: 'Custos', icon: 'attach_money', route: 'custos' },
        { label: 'Clima', icon: 'wb_sunny', route: 'clima' },
        { label: 'Manutenção', icon: 'build', route: 'manutencao' },
        { label: 'Diário', icon: 'book', route: 'diario' }
    ];

    ngOnInit(): void {
        this.loadViagem();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega dados da viagem
     */
    private loadViagem(): void {
        this.route.params
            .pipe(
                takeUntil(this.destroy$),
                switchMap(params => {
                    const viagemId = params['id'];
                    if (!viagemId) {
                        throw new Error('ID da viagem não fornecido');
                    }
                    return this.viagensService.recuperarPorId(viagemId);
                }),
                tap(() => this.isLoading.set(true)),
                catchError(error => {
                    console.error('Erro ao carregar viagem:', error);
                    this.showError('Erro ao carregar dados da viagem');
                    this.router.navigate(['/viagens']);
                    throw error;
                })
            )
            .subscribe({
                next: (viagem) => {
                    if (viagem) {
                        this.viagem.set(viagem);
                        this.viagem$.next(viagem);
                        // Carregar dados relacionados
                        this.loadRelatedData(viagem.id!);
                    } else {
                        this.showError('Viagem não encontrada');
                        this.router.navigate(['/viagens']);
                    }
                    this.isLoading.set(false);
                },
                error: () => {
                    this.isLoading.set(false);
                }
            });
    }

    /**
     * Carrega dados relacionados à viagem
     */
    private loadRelatedData(viagemId: string): void {
        this.isLoadingRelatedData.set(true);

        // Carregar dias da viagem
        this.diasViagemService.listarDiasViagem(viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dias) => {
                    this.diasViagem.set(dias);
                    this.updateEstatisticas();
                },
                error: (error) => {
                    console.error('Erro ao carregar dias da viagem:', error);
                }
            });

        // Carregar paradas da viagem
        this.paradasService.listarParadasViagem(viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (paradas) => {
                    this.paradas.set(paradas);
                    this.updateEstatisticas();
                },
                error: (error) => {
                    console.error('Erro ao carregar paradas:', error);
                }
            });

        // Carregar hospedagens da viagem
        this.hospedagensService.listarHospedagensViagem(viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (hospedagens) => {
                    this.hospedagens.set(hospedagens);
                    this.updateEstatisticas();
                },
                error: (error) => {
                    console.error('Erro ao carregar hospedagens:', error);
                }
            });

        // Carregar custos da viagem
        this.custosService.listarCustosViagem(viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (custos) => {
                    this.custos.set(custos);
                    this.updateEstatisticas();
                },
                error: (error) => {
                    console.error('Erro ao carregar custos:', error);
                }
            });

        this.isLoadingRelatedData.set(false);
    }

    /**
     * Atualiza estatísticas calculadas
     */
    private updateEstatisticas(): void {
        const dias = this.diasViagem();
        const paradas = this.paradas();
        const hospedagens = this.hospedagens();
        const custos = this.custos();

        const distanciaTotal = dias.reduce((total, dia) => total + (dia.distanciaPercorrida || 0), 0);
        const custoTotal = custos.reduce((total, custo) => total + custo.valor, 0);

        this.estatisticas.set({
            totalDias: dias.length,
            totalParadas: paradas.length,
            totalHospedagens: hospedagens.length,
            custoTotal,
            distanciaTotal
        });
    }

    /**
     * Alterna para modo de edição
     */
    onEditar(): void {
        this.isEditMode.set(true);
    }

    /**
     * Cancela edição
     */
    onCancelarEdicao(): void {
        this.isEditMode.set(false);
    }

    /**
     * Salva alterações da viagem
     */
    onViagemSalva(viagemAtualizada: Viagem): void {
        this.viagem.set(viagemAtualizada);
        this.viagem$.next(viagemAtualizada);
        this.isEditMode.set(false);
        this.showSuccess('Viagem atualizada com sucesso!');
    }

    /**
     * Exclui a viagem com confirmação
     */
    async onExcluir(): Promise<void> {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        try {
            // Obter estatísticas detalhadas da viagem
            const stats = await this.viagensService.obterEstatisticasViagem(viagem.id);

            const dialogData: ConfirmationDialogData = {
                titulo: 'Excluir Viagem',
                mensagem: `
                    <div style="text-align: left;">
                        <p><strong>Tem certeza que deseja excluir a viagem "${viagem.nome}"?</strong></p>
                        
                        <p style="color: #f44336; font-weight: 500; margin: 16px 0;">
                            ⚠️ Esta ação não pode ser desfeita!
                        </p>
                        
                        ${stats.temDadosRelacionados ? `
                            <p>Os seguintes dados serão <strong>permanentemente removidos</strong>:</p>
                            <ul style="margin: 12px 0; padding-left: 20px; line-height: 1.6;">
                                ${stats.totalDias > 0 ? `<li><strong>${stats.totalDias}</strong> ${stats.totalDias === 1 ? 'dia planejado' : 'dias planejados'}</li>` : ''}
                                ${stats.totalParadas > 0 ? `<li><strong>${stats.totalParadas}</strong> ${stats.totalParadas === 1 ? 'parada registrada' : 'paradas registradas'}</li>` : ''}
                                ${stats.totalHospedagens > 0 ? `<li><strong>${stats.totalHospedagens}</strong> ${stats.totalHospedagens === 1 ? 'hospedagem' : 'hospedagens'}</li>` : ''}
                                ${stats.totalCustos > 0 ? `<li><strong>${stats.totalCustos}</strong> ${stats.totalCustos === 1 ? 'registro de custo' : 'registros de custos'} (${this.formatarMoeda(stats.valorTotalCustos)})</li>` : ''}
                            </ul>
                            
                            <div style="background-color: #ffebee; padding: 12px; border-radius: 4px; margin: 16px 0;">
                                <p style="margin: 0; color: #c62828; font-weight: 500;">
                                    🗑️ Todos estes dados serão perdidos permanentemente!
                                </p>
                            </div>
                        ` : `
                            <div style="background-color: #e8f5e8; padding: 12px; border-radius: 4px; margin: 16px 0;">
                                <p style="margin: 0; color: #2e7d32;">
                                    ℹ️ Esta viagem não possui dados relacionados.
                                </p>
                            </div>
                        `}
                        
                        <p style="font-size: 14px; color: #666; margin-top: 16px;">
                            Digite "<strong>EXCLUIR</strong>" para confirmar que você entende que esta ação é irreversível.
                        </p>
                    </div>
                `,
                textoConfirmar: 'Sim, Excluir Permanentemente',
                textoCancelar: 'Cancelar',
                tipo: 'danger',
                icone: 'delete_forever'
            };

            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                width: '600px',
                maxWidth: '95vw',
                data: dialogData,
                disableClose: true
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result === true) {
                    this.executarExclusao(viagem.id!);
                }
            });
        } catch (error) {
            console.error('Erro ao obter estatísticas da viagem:', error);
            this.showError('Erro ao carregar informações da viagem. Tente novamente.');
        }
    }

    /**
     * Executa a exclusão da viagem
     */
    private async executarExclusao(viagemId: string): Promise<void> {
        const viagem = this.viagem();
        if (!viagem) return;

        // Mostrar loading state
        this.isLoading.set(true);

        // Mostrar snackbar de progresso
        const progressSnackBar = this.snackBar.open(
            '🗑️ Excluindo viagem e dados relacionados...',
            '',
            {
                duration: 0, // Não fecha automaticamente
                panelClass: ['info-snackbar']
            }
        );

        try {
            console.log(`[INFO] Usuário iniciou exclusão da viagem ${viagemId} (${viagem.nome})`);

            await this.viagensService.excluirViagemCompleta(viagemId);

            // Fechar snackbar de progresso
            progressSnackBar.dismiss();

            // Mostrar sucesso
            this.showSuccess(`✅ Viagem "${viagem.nome}" excluída com sucesso!`);

            console.log(`[SUCESSO] Viagem ${viagemId} excluída com sucesso pelo usuário`);

            // Navegar para dashboard após pequeno delay para mostrar a mensagem
            setTimeout(() => {
                this.router.navigate(['/dashboard']);
            }, 1500);

        } catch (error) {
            console.error(`[ERRO] Falha ao excluir viagem ${viagemId}:`, error);

            // Fechar snackbar de progresso
            progressSnackBar.dismiss();

            let mensagemErro = 'Erro inesperado ao excluir viagem. Tente novamente.';

            if (error instanceof Error) {
                if (error.message.includes('Usuário não autenticado')) {
                    mensagemErro = 'Sessão expirada. Faça login novamente.';
                    // Redirecionar para login após mostrar erro
                    setTimeout(() => {
                        this.router.navigate(['/auth/login']);
                    }, 3000);
                } else if (error.message.includes('não tem permissão')) {
                    mensagemErro = 'Você não tem permissão para excluir esta viagem.';
                } else if (error.message.includes('não encontrada')) {
                    mensagemErro = 'Viagem não encontrada. Pode ter sido excluída por outro dispositivo.';
                    // Redirecionar para dashboard
                    setTimeout(() => {
                        this.router.navigate(['/dashboard']);
                    }, 3000);
                } else if (error.message.includes('conexão') || error.message.includes('network')) {
                    mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
                } else if (error.message.includes('indisponível')) {
                    mensagemErro = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
                } else if (error.message.includes('Erro crítico')) {
                    mensagemErro = error.message; // Já é uma mensagem amigável
                } else {
                    // Extrair mensagem limpa do erro
                    const match = error.message.match(/Erro ao excluir viagem: (.+)/);
                    mensagemErro = match ? match[1] : error.message;
                }
            }

            this.showError(`❌ ${mensagemErro}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Duplica a viagem
     */
    async onDuplicar(): Promise<void> {
        const viagem = this.viagem();
        if (!viagem) return;

        try {
            const novaViagem = {
                ...viagem,
                nome: `${viagem.nome} (Cópia)`,
                status: StatusViagem.PLANEJADA,
                custoTotal: 0,
                distanciaTotal: viagem.distanciaTotal || 0
            };

            // Remove campos que não devem ser copiados
            delete (novaViagem as any).id;
            delete (novaViagem as any).criadoEm;
            delete (novaViagem as any).atualizadoEm;
            delete (novaViagem as any).estatisticas;

            const novaViagemId = await this.viagensService.criarViagem(novaViagem);
            this.showSuccess('Viagem duplicada com sucesso!');
            this.router.navigate(['/viagens', novaViagemId]);
        } catch (error) {
            console.error('Erro ao duplicar viagem:', error);
            this.showError('Erro ao duplicar viagem. Tente novamente.');
        }
    }

    /**
     * Atualiza status da viagem
     */
    async onAtualizarStatus(novoStatus: StatusViagem): Promise<void> {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        try {
            await this.viagensService.atualizarStatus(viagem.id, novoStatus);

            const viagemAtualizada = { ...viagem, status: novoStatus };
            this.viagem.set(viagemAtualizada);
            this.viagem$.next(viagemAtualizada);

            this.showSuccess('Status da viagem atualizado!');
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            this.showError('Erro ao atualizar status da viagem.');
        }
    }

    /**
     * Navega para uma aba específica
     */
    onTabChange(index: number): void {
        this.selectedTabIndex.set(index);

        // Carregar dados específicos da aba se necessário
        const viagem = this.viagem();
        if (viagem?.id) {
            this.loadTabData(index, viagem.id);
        }
    }

    /**
     * Carrega dados específicos de uma aba
     */
    private loadTabData(tabIndex: number, viagemId: string): void {
        switch (tabIndex) {
            case 1: // Dias
                if (this.diasViagem().length === 0) {
                    this.diasViagemService.listarDiasViagem(viagemId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(dias => this.diasViagem.set(dias));
                }
                break;
            case 2: // Paradas
                if (this.paradas().length === 0) {
                    this.paradasService.listarParadasViagem(viagemId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(paradas => this.paradas.set(paradas));
                }
                break;
            case 3: // Hospedagens
                if (this.hospedagens().length === 0) {
                    this.hospedagensService.listarHospedagensViagem(viagemId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(hospedagens => this.hospedagens.set(hospedagens));
                }
                break;
            case 4: // Custos
                if (this.custos().length === 0) {
                    this.custosService.listarCustosViagem(viagemId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(custos => this.custos.set(custos));
                }
                break;
        }
    }

    /**
     * Ações rápidas para adicionar novos itens
     */
    onAdicionarDia(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            // Navegar para formulário de novo dia ou abrir modal
            console.log('Adicionar novo dia para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de adicionar dia será implementada em breve');
        }
    }

    onAdicionarParada(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            console.log('Adicionar nova parada para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de adicionar parada será implementada em breve');
        }
    }

    onAdicionarHospedagem(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            console.log('Adicionar nova hospedagem para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de adicionar hospedagem será implementada em breve');
        }
    }

    onAdicionarCusto(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            console.log('Adicionar novo custo para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de adicionar custo será implementada em breve');
        }
    }

    onAtualizarPrevisaoTempo(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            console.log('Atualizar previsão do tempo para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de previsão do tempo será implementada em breve');
        }
    }

    onRegistrarManutencao(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            console.log('Registrar manutenção para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de manutenção será implementada em breve');
        }
    }

    onNovaEntradaDiario(): void {
        const viagem = this.viagem();
        if (viagem?.id) {
            console.log('Nova entrada no diário para viagem:', viagem.id);
            this.showSuccess('Funcionalidade de diário será implementada em breve');
        }
    }

    /**
     * Volta para lista de viagens
     */
    onVoltar(): void {
        this.router.navigate(['/viagens']);
    }

    /**
     * Retorna a cor do chip baseada no status
     */
    getCorStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'primary';
            case StatusViagem.EM_ANDAMENTO:
                return 'accent';
            case StatusViagem.FINALIZADA:
                return 'warn';
            case StatusViagem.CANCELADA:
                return '';
            default:
                return 'primary';
        }
    }

    /**
     * Retorna o texto do status em português
     */
    getTextoStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'Planejada';
            case StatusViagem.EM_ANDAMENTO:
                return 'Em Andamento';
            case StatusViagem.FINALIZADA:
                return 'Finalizada';
            case StatusViagem.CANCELADA:
                return 'Cancelada';
            default:
                return status;
        }
    }

    /**
     * Retorna o ícone do status
     */
    getIconeStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'schedule';
            case StatusViagem.EM_ANDAMENTO:
                return 'directions_bike';
            case StatusViagem.FINALIZADA:
                return 'check_circle';
            case StatusViagem.CANCELADA:
                return 'cancel';
            default:
                return 'help';
        }
    }

    /**
     * Formata data para exibição
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    /**
     * Formata valor monetário
     */
    formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    /**
     * Formata distância
     */
    formatarDistancia(distancia: number): string {
        return `${distancia.toLocaleString('pt-BR')} km`;
    }

    /**
     * Calcula duração da viagem em dias
     */
    calcularDuracao(viagem: Viagem): number {
        const inicio = new Date(viagem.dataInicio);
        const fim = new Date(viagem.dataFim);
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Verifica se pode editar a viagem
     */
    podeEditar(): boolean {
        const viagem = this.viagem();
        return viagem?.status !== StatusViagem.FINALIZADA;
    }

    /**
     * Verifica se pode iniciar a viagem
     */
    podeIniciar(): boolean {
        const viagem = this.viagem();
        return viagem?.status === StatusViagem.PLANEJADA;
    }

    /**
     * Verifica se pode finalizar a viagem
     */
    podeFinalizar(): boolean {
        const viagem = this.viagem();
        return viagem?.status === StatusViagem.EM_ANDAMENTO;
    }

    /**
     * Exibe mensagem de sucesso
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Exibe mensagem de erro
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }

    /**
     * TrackBy function para otimizar renderização de listas
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    /**
     * Retorna ícone para tipo de parada
     */
    getIconeParada(tipo: string): string {
        const icones: { [key: string]: string } = {
            'abastecimento': 'local_gas_station',
            'refeicao': 'restaurant',
            'ponto-interesse': 'place',
            'descanso': 'hotel',
            'manutencao': 'build',
            'hospedagem': 'hotel'
        };
        return icones[tipo] || 'place';
    }

    /**
     * Retorna texto para tipo de parada
     */
    getTipoParadaTexto(tipo: string): string {
        const textos: { [key: string]: string } = {
            'abastecimento': 'Abastecimento',
            'refeicao': 'Refeição',
            'ponto-interesse': 'Ponto de Interesse',
            'descanso': 'Descanso',
            'manutencao': 'Manutenção',
            'hospedagem': 'Hospedagem'
        };
        return textos[tipo] || tipo;
    }

    /**
     * Retorna ícone para categoria de custo
     */
    getIconeCategoria(categoria: string): string {
        const icones: { [key: string]: string } = {
            'combustivel': 'local_gas_station',
            'hospedagem': 'hotel',
            'alimentacao': 'restaurant',
            'manutencao': 'build',
            'pedagio': 'toll',
            'seguro': 'security',
            'outros': 'more_horiz'
        };
        return icones[categoria] || 'attach_money';
    }

    /**
     * Retorna texto para categoria de custo
     */
    getCategoriaTexto(categoria: string): string {
        const textos: { [key: string]: string } = {
            'combustivel': 'Combustível',
            'hospedagem': 'Hospedagem',
            'alimentacao': 'Alimentação',
            'manutencao': 'Manutenção',
            'pedagio': 'Pedágio',
            'seguro': 'Seguro',
            'outros': 'Outros'
        };
        return textos[categoria] || categoria;
    }
}