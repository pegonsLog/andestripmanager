import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Componentes compartilhados
import { ViagemCardComponent, ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/components';

// Services e Models
import { ViagensService } from '../../services/viagens.service';
import { AuthService } from '../../core/services/auth.service';
import { Viagem, StatusViagem, Usuario } from '../../models';

interface EstatisticasDashboard {
    totalViagens: number;
    viagensEmAndamento: number;
    viagensPlanejadas: number;
    viagensFinalizadas: number;
    distanciaTotal: number;
    custoTotal: number;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatGridListModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatPaginatorModule,
        MatButtonToggleModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTooltipModule,
        ViagemCardComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    private readonly router = inject(Router);
    private readonly viagensService = inject(ViagensService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    // Estados do componente
    readonly isLoading$ = new BehaviorSubject<boolean>(true);
    readonly error$ = new BehaviorSubject<string | null>(null);

    // Dados do dashboard
    readonly viagens$ = new BehaviorSubject<Viagem[]>([]);
    readonly viagensRecentes$ = new BehaviorSubject<Viagem[]>([]);
    readonly viagensFiltradas$ = new BehaviorSubject<Viagem[]>([]);
    readonly viagensPaginadas$ = new BehaviorSubject<Viagem[]>([]);
    readonly estatisticas$ = new BehaviorSubject<EstatisticasDashboard>({
        totalViagens: 0,
        viagensEmAndamento: 0,
        viagensPlanejadas: 0,
        viagensFinalizadas: 0,
        distanciaTotal: 0,
        custoTotal: 0
    });

    // Controles de filtro e busca
    readonly searchControl = new FormControl('');
    readonly statusFilter$ = new BehaviorSubject<StatusViagem | 'todas'>('todas');
    readonly sortBy$ = new BehaviorSubject<'nome' | 'dataInicio' | 'dataFim' | 'custoTotal'>('dataInicio');
    readonly sortDirection$ = new BehaviorSubject<'asc' | 'desc'>('desc');

    // Paginação
    readonly pageSize = 6;
    readonly currentPage$ = new BehaviorSubject<number>(0);
    readonly totalItems$ = new BehaviorSubject<number>(0);

    // Dados do usuário
    readonly usuario$: Observable<Usuario | null>;

    // Propriedades para template (evitar pipes em eventos)
    currentSortBy: 'nome' | 'dataInicio' | 'dataFim' | 'custoTotal' = 'dataInicio';
    currentSortDirection: 'asc' | 'desc' = 'desc';
    currentStatusFilter: StatusViagem | 'todas' = 'todas';

    // Enums para template
    readonly StatusViagem = StatusViagem;

    constructor() {
        this.usuario$ = this.authService.currentUser$;
    }

    ngOnInit(): void {
        this.carregarDadosDashboard();
        this.configurarFiltros();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega todos os dados necessários para o dashboard
     */
    private carregarDadosDashboard(): void {
        this.isLoading$.next(true);
        this.error$.next(null);

        // Carrega viagens do usuário
        this.viagensService.listarViagensUsuario()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('[ERRO] Falha ao carregar viagens:', error);
                    this.error$.next('Erro ao carregar viagens. Tente novamente.');
                    this.isLoading$.next(false);
                    return [];
                })
            )
            .subscribe(viagens => {
                this.viagens$.next(viagens);
                this.calcularEstatisticas(viagens);
                this.definirViagensRecentes(viagens);
                this.aplicarFiltros();
                this.isLoading$.next(false);
            });
    }

    /**
     * Configura os filtros e busca
     */
    private configurarFiltros(): void {
        // Sincronizar propriedades locais com BehaviorSubjects
        this.sortBy$.pipe(takeUntil(this.destroy$)).subscribe(sortBy => {
            this.currentSortBy = sortBy;
        });

        this.sortDirection$.pipe(takeUntil(this.destroy$)).subscribe(direction => {
            this.currentSortDirection = direction;
        });

        this.statusFilter$.pipe(takeUntil(this.destroy$)).subscribe(status => {
            this.currentStatusFilter = status;
        });

        // Combina todos os filtros para aplicar em tempo real
        combineLatest([
            this.viagens$,
            this.searchControl.valueChanges.pipe(
                startWith(''),
                debounceTime(300),
                distinctUntilChanged()
            ),
            this.statusFilter$,
            this.sortBy$,
            this.sortDirection$
        ]).pipe(
            takeUntil(this.destroy$),
            map(([viagens, searchTerm, statusFilter, sortBy, sortDirection]) => {
                let viagensFiltradas = [...viagens];

                // Aplicar busca por nome
                if (searchTerm && searchTerm.trim()) {
                    viagensFiltradas = viagensFiltradas.filter(viagem =>
                        viagem.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        viagem.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        viagem.destino?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }

                // Aplicar filtro por status
                if (statusFilter !== 'todas') {
                    viagensFiltradas = viagensFiltradas.filter(viagem =>
                        viagem.status === statusFilter
                    );
                }

                // Aplicar ordenação
                viagensFiltradas.sort((a, b) => {
                    let valueA: any, valueB: any;

                    switch (sortBy) {
                        case 'nome':
                            valueA = a.nome.toLowerCase();
                            valueB = b.nome.toLowerCase();
                            break;
                        case 'dataInicio':
                            valueA = new Date(a.dataInicio);
                            valueB = new Date(b.dataInicio);
                            break;
                        case 'dataFim':
                            valueA = new Date(a.dataFim);
                            valueB = new Date(b.dataFim);
                            break;
                        case 'custoTotal':
                            valueA = a.custoTotal || 0;
                            valueB = b.custoTotal || 0;
                            break;
                        default:
                            return 0;
                    }

                    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
                    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });

                return viagensFiltradas;
            })
        ).subscribe(viagensFiltradas => {
            this.viagensFiltradas$.next(viagensFiltradas);
            this.totalItems$.next(viagensFiltradas.length);
            this.aplicarPaginacao();
        });

        // Reagir a mudanças de página
        this.currentPage$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.aplicarPaginacao();
        });
    }

    /**
     * Aplica filtros às viagens
     */
    private aplicarFiltros(): void {
        // Trigger para reprocessar filtros
        this.viagens$.next(this.viagens$.value);
    }

    /**
     * Aplica paginação às viagens filtradas
     */
    private aplicarPaginacao(): void {
        const viagensFiltradas = this.viagensFiltradas$.value;
        const currentPage = this.currentPage$.value;
        const startIndex = currentPage * this.pageSize;
        const endIndex = startIndex + this.pageSize;

        const viagensPaginadas = viagensFiltradas.slice(startIndex, endIndex);
        this.viagensPaginadas$.next(viagensPaginadas);
    }

    /**
     * Calcula estatísticas baseadas nas viagens
     */
    private calcularEstatisticas(viagens: Viagem[]): void {
        const estatisticas: EstatisticasDashboard = {
            totalViagens: viagens.length,
            viagensEmAndamento: viagens.filter(v => v.status === StatusViagem.EM_ANDAMENTO).length,
            viagensPlanejadas: viagens.filter(v => v.status === StatusViagem.PLANEJADA).length,
            viagensFinalizadas: viagens.filter(v => v.status === StatusViagem.FINALIZADA).length,
            distanciaTotal: viagens.reduce((total, v) => total + (v.distanciaTotal || 0), 0),
            custoTotal: viagens.reduce((total, v) => total + (v.custoTotal || 0), 0)
        };

        this.estatisticas$.next(estatisticas);
    }

    /**
     * Define as viagens mais recentes (últimas 5)
     */
    private definirViagensRecentes(viagens: Viagem[]): void {
        const recentes = viagens
            .sort((a, b) => {
                const dataA = a.atualizadoEm || a.criadoEm;
                const dataB = b.atualizadoEm || b.criadoEm;
                return (dataB?.toMillis() || 0) - (dataA?.toMillis() || 0);
            })
            .slice(0, 5);

        this.viagensRecentes$.next(recentes);
    }

    /**
     * Navega para criação de nova viagem
     */
    criarNovaViagem(): void {
        this.router.navigate(['/viagens/nova']);
    }

    /**
     * Navega para lista completa de viagens
     */
    verTodasViagens(): void {
        this.router.navigate(['/viagens']);
    }

    /**
     * Navega para página de configurações/perfil
     */
    abrirConfiguracoes(): void {
        this.router.navigate(['/perfil']);
    }

    /**
     * Navega para detalhes de uma viagem
     */
    verDetalhesViagem(viagemId: string): void {
        this.router.navigate(['/viagens', viagemId]);
    }

    /**
     * Recarrega os dados do dashboard
     */
    recarregarDados(): void {
        this.carregarDadosDashboard();
    }

    /**
     * Faz logout do usuário
     */
    async fazerLogout(): Promise<void> {
        try {
            await this.authService.logout();
            this.snackBar.open('Logout realizado com sucesso!', 'Fechar', { duration: 3000 });
            this.router.navigate(['/auth/login']);
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            this.snackBar.open('Erro ao fazer logout. Tente novamente.', 'Fechar', { duration: 5000 });
        }
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
            default:
                return status;
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
     * TrackBy function para otimizar performance da lista
     */
    trackByViagemId(index: number, viagem: Viagem): string {
        return viagem.id || index.toString();
    }

    /**
     * Manipula evento de edição de viagem
     */
    onEditarViagem(viagemId: string): void {
        this.router.navigate(['/viagens', viagemId, 'editar']);
    }

    /**
     * Manipula evento de exclusão de viagem
     */
    async onExcluirViagem(viagemId: string): Promise<void> {
        const viagem = this.viagens$.value.find(v => v.id === viagemId);
        if (!viagem) {
            this.showError('Viagem não encontrada');
            return;
        }

        try {
            // Obter estatísticas detalhadas da viagem
            const stats = await this.viagensService.obterEstatisticasViagem(viagemId);

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
                    this.executarExclusaoViagem(viagemId, viagem.nome);
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
    private async executarExclusaoViagem(viagemId: string, nomeViagem: string): Promise<void> {
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
            console.log(`[INFO] Usuário iniciou exclusão da viagem ${viagemId} (${nomeViagem}) do dashboard`);

            await this.viagensService.excluirViagemCompleta(viagemId);

            // Fechar snackbar de progresso
            progressSnackBar.dismiss();

            // Mostrar sucesso
            this.showSuccess(`✅ Viagem "${nomeViagem}" excluída com sucesso!`);

            console.log(`[SUCESSO] Viagem ${viagemId} excluída com sucesso do dashboard`);

            // Recarregar dados do dashboard
            this.carregarDadosDashboard();
        } catch (error) {
            console.error(`[ERRO] Falha ao excluir viagem ${viagemId} do dashboard:`, error);

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
                    // Recarregar dashboard
                    this.carregarDadosDashboard();
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
        }
    }

    /**
     * Manipula evento de duplicação de viagem
     */
    onDuplicarViagem(viagemId: string): void {
        // TODO: Implementar duplicação de viagem
        console.log('Duplicar viagem:', viagemId);
        // Aqui seria implementada a lógica de duplicação
    }

    /**
     * Altera o filtro de status
     */
    alterarFiltroStatus(status: StatusViagem | 'todas'): void {
        this.statusFilter$.next(status);
        this.currentPage$.next(0); // Reset para primeira página
    }

    /**
     * Altera a ordenação
     */
    alterarOrdenacao(campo: 'nome' | 'dataInicio' | 'dataFim' | 'custoTotal'): void {
        const currentSort = this.sortBy$.value;
        const currentDirection = this.sortDirection$.value;

        if (currentSort === campo) {
            // Inverte a direção se for o mesmo campo
            this.sortDirection$.next(currentDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Novo campo, começa com desc
            this.sortBy$.next(campo);
            this.sortDirection$.next('desc');
        }

        this.currentPage$.next(0); // Reset para primeira página
    }

    /**
     * Manipula mudança de página
     */
    onPageChange(event: PageEvent): void {
        this.currentPage$.next(event.pageIndex);
    }

    /**
     * Limpa todos os filtros
     */
    limparFiltros(): void {
        this.searchControl.setValue('');
        this.statusFilter$.next('todas');
        this.sortBy$.next('dataInicio');
        this.sortDirection$.next('desc');
        this.currentPage$.next(0);
    }

    /**
     * Retorna o texto do filtro de status
     */
    getTextoFiltroStatus(status: StatusViagem | 'todas'): string {
        if (status === 'todas') return 'Todas';
        return this.getTextoStatus(status);
    }

    /**
     * Retorna se há filtros ativos
     */
    hasFiltrosAtivos(): boolean {
        return !!(
            this.searchControl.value ||
            this.statusFilter$.value !== 'todas'
        );
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
     * Retorna tooltip para ordenação
     */
    getTooltipOrdenacao(): string {
        return this.currentSortDirection === 'asc' ? 'Crescente' : 'Decrescente';
    }

    /**
     * Retorna ícone para ordenação
     */
    getIconeOrdenacao(): string {
        return this.currentSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }

    /**
     * Alterna direção da ordenação atual
     */
    alterarDirecaoOrdenacao(): void {
        this.alterarOrdenacao(this.currentSortBy);
    }
}