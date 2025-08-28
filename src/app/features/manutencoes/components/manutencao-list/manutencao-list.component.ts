import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Manutencao, CategoriaManutencao } from '../../../../models/manutencao.interface';
import { TipoManutencao } from '../../../../models/enums';
import { ManutencoesService } from '../../../../services/manutencoes.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Interface para filtros de manutenção
 */
interface FiltrosManutencao {
    tipo?: TipoManutencao;
    categoria?: CategoriaManutencao;
    dataInicio?: string;
    dataFim?: string;
    textoBusca?: string;
}

/**
 * Componente standalone para listagem e histórico de manutenções
 * Permite visualizar, filtrar e gerenciar manutenções da motocicleta
 */
@Component({
    selector: 'app-manutencao-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatProgressSpinnerModule,
        MatExpansionModule,
        MatDividerModule,
        MatTooltipModule
    ],
    templateUrl: './manutencao-list.component.html',
    styleUrls: ['./manutencao-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManutencaoListComponent implements OnInit, OnDestroy {
    @Input() viagemId?: string;
    @Input() showFilters = true;
    @Input() showActions = true;
    @Output() editarManutencao = new EventEmitter<Manutencao>();
    @Output() excluirManutencao = new EventEmitter<Manutencao>();
    @Output() novaManutencao = new EventEmitter<void>();

    // Injeção de dependências
    private fb = inject(FormBuilder);
    private manutencoesService = inject(ManutencoesService);
    private authService = inject(AuthService);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    // Propriedades do componente
    manutencoes$ = new BehaviorSubject<Manutencao[]>([]);
    manutencoesFiltradas$!: Observable<Manutencao[]>;
    estatisticas$!: Observable<any>;
    isLoading = false;
    filtrosForm!: FormGroup;

    // Enums para o template
    tiposManutencao = Object.values(TipoManutencao);
    categoriasManutencao = Object.values(CategoriaManutencao);

    // Subject para gerenciar unsubscribe
    private destroy$ = new Subject<void>();
    private filtros$ = new BehaviorSubject<FiltrosManutencao>({});

    ngOnInit(): void {
        this.criarFormularioFiltros();
        this.configurarFiltros();
        this.carregarManutencoes();
        this.carregarEstatisticas();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Cria o formulário de filtros
     */
    private criarFormularioFiltros(): void {
        this.filtrosForm = this.fb.group({
            tipo: [''],
            categoria: [''],
            dataInicio: [''],
            dataFim: [''],
            textoBusca: ['']
        });
    }

    /**
     * Configura os observables de filtros
     */
    private configurarFiltros(): void {
        // Observar mudanças nos filtros
        this.filtrosForm.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                startWith(this.filtrosForm.value),
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(filtros => {
                this.filtros$.next(this.limparFiltrosVazios(filtros));
            });

        // Combinar manutenções com filtros
        this.manutencoesFiltradas$ = combineLatest([
            this.manutencoes$,
            this.filtros$
        ]).pipe(
            map(([manutencoes, filtros]) => this.aplicarFiltros(manutencoes, filtros))
        );
    }

    /**
     * Carrega as manutenções do usuário ou viagem
     */
    private async carregarManutencoes(): Promise<void> {
        this.isLoading = true;

        try {
            const usuarioAtual = await this.authService.getCurrentUser();
            if (!usuarioAtual) {
                throw new Error('Usuário não autenticado');
            }

            let manutencoes$: Observable<Manutencao[]>;

            if (this.viagemId) {
                manutencoes$ = this.manutencoesService.recuperarPorViagem(this.viagemId);
            } else {
                manutencoes$ = this.manutencoesService.recuperarPorUsuario(usuarioAtual.id!);
            }

            manutencoes$
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (manutencoes) => {
                        this.manutencoes$.next(manutencoes);
                        this.isLoading = false;
                    },
                    error: (error) => {
                        console.error('Erro ao carregar manutenções:', error);
                        this.snackBar.open('Erro ao carregar manutenções.', 'Fechar', { duration: 5000 });
                        this.isLoading = false;
                    }
                });
        } catch (error) {
            console.error('Erro ao carregar manutenções:', error);
            this.snackBar.open('Erro ao carregar manutenções.', 'Fechar', { duration: 5000 });
            this.isLoading = false;
        }
    }

    /**
     * Carrega estatísticas das manutenções
     */
    private async carregarEstatisticas(): Promise<void> {
        if (this.viagemId) return; // Não mostrar estatísticas para viagem específica

        try {
            const usuarioAtual = await this.authService.getCurrentUser();
            if (!usuarioAtual) return;

            this.estatisticas$ = this.manutencoesService.recuperarEstatisticas(usuarioAtual.id!);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    /**
     * Aplica filtros às manutenções
     */
    private aplicarFiltros(manutencoes: Manutencao[], filtros: FiltrosManutencao): Manutencao[] {
        return manutencoes.filter(manutencao => {
            // Filtro por tipo
            if (filtros.tipo && manutencao.tipo !== filtros.tipo) {
                return false;
            }

            // Filtro por categoria (verifica nos itens)
            if (filtros.categoria) {
                const temCategoria = manutencao.itensServicos.some(item => item.categoria === filtros.categoria);
                if (!temCategoria) return false;
            }

            // Filtro por data de início
            if (filtros.dataInicio && manutencao.data < filtros.dataInicio) {
                return false;
            }

            // Filtro por data de fim
            if (filtros.dataFim && manutencao.data > filtros.dataFim) {
                return false;
            }

            // Filtro por texto (busca na descrição, local, oficina)
            if (filtros.textoBusca) {
                const texto = filtros.textoBusca.toLowerCase();
                const contemTexto =
                    manutencao.descricao.toLowerCase().includes(texto) ||
                    (manutencao.local?.toLowerCase().includes(texto)) ||
                    (manutencao.oficina?.toLowerCase().includes(texto)) ||
                    manutencao.itensServicos.some(item =>
                        item.nome.toLowerCase().includes(texto) ||
                        (item.marca?.toLowerCase().includes(texto))
                    );
                if (!contemTexto) return false;
            }

            return true;
        });
    }

    /**
     * Remove filtros vazios do objeto
     */
    private limparFiltrosVazios(filtros: any): FiltrosManutencao {
        const filtrosLimpos: FiltrosManutencao = {};

        Object.keys(filtros).forEach(key => {
            if (filtros[key] && filtros[key] !== '') {
                filtrosLimpos[key as keyof FiltrosManutencao] = filtros[key];
            }
        });

        return filtrosLimpos;
    }

    /**
     * Limpa todos os filtros
     */
    limparFiltros(): void {
        this.filtrosForm.reset();
    }

    /**
     * Emite evento para criar nova manutenção
     */
    onNovaManutencao(): void {
        this.novaManutencao.emit();
    }

    /**
     * Emite evento para editar manutenção
     */
    onEditarManutencao(manutencao: Manutencao): void {
        this.editarManutencao.emit(manutencao);
    }

    /**
     * Confirma e emite evento para excluir manutenção
     */
    async onExcluirManutencao(manutencao: Manutencao): Promise<void> {
        const confirmacao = confirm(
            `Tem certeza que deseja excluir a manutenção "${manutencao.descricao}"?\n\nEsta ação não pode ser desfeita.`
        );

        if (confirmacao) {
            try {
                if (manutencao.id) {
                    await this.manutencoesService.remove(manutencao.id);
                    this.snackBar.open('Manutenção excluída com sucesso!', 'Fechar', { duration: 3000 });
                }
            } catch (error) {
                console.error('Erro ao excluir manutenção:', error);
                this.snackBar.open('Erro ao excluir manutenção. Tente novamente.', 'Fechar', { duration: 5000 });
            }
        }
    }

    /**
     * Calcula o custo total das manutenções filtradas
     */
    calcularCustoTotal(manutencoes: Manutencao[]): number {
        return manutencoes.reduce((total, manutencao) => total + manutencao.custo, 0);
    }

    /**
     * Obtém o label traduzido para tipo de manutenção
     */
    obterLabelTipoManutencao(tipo: TipoManutencao): string {
        const labels = {
            [TipoManutencao.PREVENTIVA]: 'Preventiva',
            [TipoManutencao.CORRETIVA]: 'Corretiva',
            [TipoManutencao.EMERGENCIAL]: 'Emergencial'
        };
        return labels[tipo];
    }

    /**
     * Obtém o label traduzido para categoria de manutenção
     */
    obterLabelCategoriaManutencao(categoria: CategoriaManutencao): string {
        const labels = {
            [CategoriaManutencao.MOTOR]: 'Motor',
            [CategoriaManutencao.FREIOS]: 'Freios',
            [CategoriaManutencao.SUSPENSAO]: 'Suspensão',
            [CategoriaManutencao.PNEUS]: 'Pneus',
            [CategoriaManutencao.ELETRICA]: 'Elétrica',
            [CategoriaManutencao.TRANSMISSAO]: 'Transmissão',
            [CategoriaManutencao.CARROCERIA]: 'Carroceria',
            [CategoriaManutencao.OUTROS]: 'Outros'
        };
        return labels[categoria];
    }

    /**
     * Obtém a cor do chip baseada no tipo de manutenção
     */
    obterCorTipoManutencao(tipo: TipoManutencao): string {
        const cores = {
            [TipoManutencao.PREVENTIVA]: 'primary',
            [TipoManutencao.CORRETIVA]: 'accent',
            [TipoManutencao.EMERGENCIAL]: 'warn'
        };
        return cores[tipo];
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
     * Obtém ícone para tipo de manutenção
     */
    obterIconeTipoManutencao(tipo: TipoManutencao): string {
        const icones = {
            [TipoManutencao.PREVENTIVA]: 'schedule',
            [TipoManutencao.CORRETIVA]: 'build',
            [TipoManutencao.EMERGENCIAL]: 'warning'
        };
        return icones[tipo];
    }

    /**
     * Verifica se há próxima manutenção recomendada
     */
    temProximaManutencao(manutencao: Manutencao): boolean {
        return !!(manutencao.proximaManutencaoKm || manutencao.proximaManutencaoData);
    }

    /**
     * Obtém texto da próxima manutenção
     */
    obterTextoProximaManutencao(manutencao: Manutencao): string {
        const textos = [];

        if (manutencao.proximaManutencaoKm) {
            textos.push(`${manutencao.proximaManutencaoKm.toLocaleString('pt-BR')} km`);
        }

        if (manutencao.proximaManutencaoData) {
            textos.push(this.formatarData(manutencao.proximaManutencaoData));
        }

        return textos.join(' ou ');
    }

    /**
     * TrackBy function para otimizar a renderização da lista
     */
    trackByManutencao(index: number, manutencao: Manutencao): string {
        return manutencao.id || index.toString();
    }
}