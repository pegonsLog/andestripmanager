import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';

import { Custo, CategoriaCusto } from '../../models';
import { CustosService } from '../../services/custos.service';
import { CustoFormComponent } from './components/custo-form/custo-form.component';
import { CustosListComponent } from './components/custos-list/custos-list.component';
import { CustosFiltrosComponent, FiltrosCustos } from './components/custos-filtros/custos-filtros.component';

/**
 * Componente principal para gerenciamento de custos
 * Integra formulário, listagem e filtros de custos
 */
@Component({
    selector: 'app-custos',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        CustoFormComponent,
        CustosListComponent,
        CustosFiltrosComponent
    ],
    templateUrl: './custos.component.html',
    styleUrls: ['./custos.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustosComponent implements OnInit, OnDestroy {
    @Input() viagemId!: string;
    @Input() diaViagemId?: string;

    private custosService = inject(CustosService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private destroy$ = new Subject<void>();

    // Observables
    custosTodos$ = new BehaviorSubject<Custo[]>([]);
    custosFiltrados$ = new BehaviorSubject<Custo[]>([]);
    filtrosAtivos$ = new BehaviorSubject<FiltrosCustos>({});
    isLoading$ = new BehaviorSubject<boolean>(true);

    // Estado do componente
    selectedTabIndex = 0;
    custoEditando: Custo | undefined;

    ngOnInit(): void {
        this.carregarCustos();
        this.configurarFiltros();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega todos os custos da viagem
     */
    private carregarCustos(): void {
        if (!this.viagemId) {
            console.error('viagemId é obrigatório');
            return;
        }

        this.isLoading$.next(true);

        this.custosService.listarCustosViagem(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (custos) => {
                    this.custosTodos$.next(custos);
                    this.aplicarFiltros(this.filtrosAtivos$.value);
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar custos:', error);
                    this.snackBar.open('Erro ao carregar custos', 'Fechar', {
                        duration: 3000,
                        panelClass: ['error-snackbar']
                    });
                    this.isLoading$.next(false);
                }
            });
    }

    /**
     * Configura sistema de filtros
     */
    private configurarFiltros(): void {
        combineLatest([
            this.custosTodos$,
            this.filtrosAtivos$
        ]).pipe(
            takeUntil(this.destroy$),
            map(([custos, filtros]) => this.filtrarCustos(custos, filtros))
        ).subscribe(custosFiltrados => {
            this.custosFiltrados$.next(custosFiltrados);
        });
    }

    /**
     * Filtra custos baseado nos critérios
     */
    private filtrarCustos(custos: Custo[], filtros: FiltrosCustos): Custo[] {
        return custos.filter(custo => {
            // Filtro por categoria
            if (filtros.categoria && custo.categoria !== filtros.categoria) {
                return false;
            }

            // Filtro por tipo
            if (filtros.tipo && custo.tipo !== filtros.tipo) {
                return false;
            }

            // Filtro por período
            if (filtros.dataInicio && custo.data < filtros.dataInicio) {
                return false;
            }
            if (filtros.dataFim && custo.data > filtros.dataFim) {
                return false;
            }

            // Filtro por valor
            if (filtros.valorMinimo && custo.valor < filtros.valorMinimo) {
                return false;
            }
            if (filtros.valorMaximo && custo.valor > filtros.valorMaximo) {
                return false;
            }

            // Filtro por descrição
            if (filtros.descricao) {
                const descricaoLower = custo.descricao.toLowerCase();
                const filtroLower = filtros.descricao.toLowerCase();
                if (!descricaoLower.includes(filtroLower)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Aplica filtros aos custos
     */
    onFiltrosAplicados(filtros: FiltrosCustos): void {
        this.filtrosAtivos$.next(filtros);
    }

    /**
     * Abre formulário para novo custo
     */
    novoCusto(): void {
        this.custoEditando = undefined;
        this.selectedTabIndex = 0; // Aba do formulário
    }

    /**
     * Edita um custo existente
     */
    editarCusto(custo: Custo): void {
        this.custoEditando = custo;
        this.selectedTabIndex = 0; // Aba do formulário
    }

    /**
     * Exclui um custo
     */
    async excluirCusto(custo: Custo): Promise<void> {
        if (!custo.id) return;

        const confirmacao = confirm(`Tem certeza que deseja excluir o custo "${custo.descricao}"?`);
        if (!confirmacao) return;

        try {
            await this.custosService.remove(custo.id);
            this.snackBar.open('Custo excluído com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });
            this.carregarCustos();
        } catch (error) {
            console.error('Erro ao excluir custo:', error);
            this.snackBar.open('Erro ao excluir custo', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
        }
    }

    /**
     * Manipula salvamento de custo
     */
    onCustoSalvo(custo: Custo): void {
        this.carregarCustos();
        this.selectedTabIndex = 1; // Volta para aba de listagem
        this.custoEditando = undefined;
    }

    /**
     * Cancela edição de custo
     */
    onCancelarEdicao(): void {
        this.custoEditando = undefined;
        this.selectedTabIndex = 1; // Volta para aba de listagem
    }

    /**
     * Manipula exportação de dados
     */
    onExportacao(tipo: 'json' | 'csv'): void {
        const totalCustos = this.custosFiltrados$.value.length;
        const mensagem = `${totalCustos} custo(s) exportado(s) em formato ${tipo.toUpperCase()}`;

        this.snackBar.open(mensagem, 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Manipula upload de comprovante
     */
    async onUploadComprovante(evento: { custoId: string, arquivo: File }): Promise<void> {
        try {
            // Aqui você implementaria o upload para Firebase Storage
            // Por enquanto, apenas simula o sucesso

            this.snackBar.open('Comprovante enviado com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });

            // Recarregar custos para atualizar o status do comprovante
            this.carregarCustos();

        } catch (error) {
            console.error('Erro ao fazer upload do comprovante:', error);
            this.snackBar.open('Erro ao enviar comprovante', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
        }
    }

    /**
     * Obtém estatísticas dos custos
     */
    obterEstatisticas(): Observable<{
        total: number;
        totalPlanejado: number;
        totalReal: number;
        porCategoria: Map<CategoriaCusto, number>;
    }> {
        return this.custosFiltrados$.pipe(
            map(custos => {
                const total = custos.reduce((sum, c) => sum + c.valor, 0);
                const totalPlanejado = custos
                    .filter(c => c.tipo === 'planejado')
                    .reduce((sum, c) => sum + c.valor, 0);
                const totalReal = custos
                    .filter(c => c.tipo === 'real')
                    .reduce((sum, c) => sum + c.valor, 0);

                const porCategoria = new Map<CategoriaCusto, number>();
                custos.forEach(custo => {
                    const atual = porCategoria.get(custo.categoria) || 0;
                    porCategoria.set(custo.categoria, atual + custo.valor);
                });

                return {
                    total,
                    totalPlanejado,
                    totalReal,
                    porCategoria
                };
            })
        );
    }

    /**
     * Recarrega todos os dados
     */
    recarregar(): void {
        this.carregarCustos();
    }

    /**
     * Verifica se há custos
     */
    temCustos(): Observable<boolean> {
        return this.custosTodos$.pipe(
            map(custos => custos.length > 0)
        );
    }

    /**
     * Verifica se há filtros ativos
     */
    temFiltrosAtivos(): Observable<boolean> {
        return this.filtrosAtivos$.pipe(
            map(filtros => Object.keys(filtros).length > 0)
        );
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
}