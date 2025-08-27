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

// Componentes compartilhados
import { ViagemCardComponent } from '../../shared/components';

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

    // Enums para template
    readonly StatusViagem = StatusViagem;

    constructor() {
        this.usuario$ = this.authService.usuario$;
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
                return dataB?.toMillis() - dataA?.toMillis();
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
    onExcluirViagem(viagemId: string): void {
        // TODO: Implementar confirmação de exclusão
        console.log('Excluir viagem:', viagemId);
        // Aqui seria implementada a lógica de confirmação e exclusão
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
}