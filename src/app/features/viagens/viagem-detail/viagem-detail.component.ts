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
import { Viagem, StatusViagem } from '../../../models';
import { ViagensService } from '../../../services/viagens.service';

// Componentes
import { ViagemFormComponent } from '../viagem-form/viagem-form.component';

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
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);
    private destroy$ = new Subject<void>();

    // Signals para estado reativo
    viagem = signal<Viagem | null>(null);
    isLoading = signal<boolean>(true);
    selectedTabIndex = signal<number>(0);
    isEditMode = signal<boolean>(false);

    // Observables
    viagem$ = new BehaviorSubject<Viagem | null>(null);

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
     * Exclui a viagem
     */
    async onExcluir(): Promise<void> {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        const confirmacao = confirm(
            `Tem certeza que deseja excluir a viagem "${viagem.nome}"?\n\n` +
            'Esta ação não pode ser desfeita e todos os dados relacionados ' +
            '(dias, paradas, hospedagens, custos, etc.) serão permanentemente removidos.'
        );

        if (!confirmacao) return;

        try {
            await this.viagensService.remove(viagem.id);
            this.showSuccess('Viagem excluída com sucesso!');
            this.router.navigate(['/viagens']);
        } catch (error) {
            console.error('Erro ao excluir viagem:', error);
            this.showError('Erro ao excluir viagem. Tente novamente.');
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
}