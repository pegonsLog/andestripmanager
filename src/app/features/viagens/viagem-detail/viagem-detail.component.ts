import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { Subject, BehaviorSubject, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// Models e Services
import { Viagem, StatusViagem, DiaViagem, Parada, Hospedagem, Custo } from '../../../models';
import { Manutencao } from '../../../models/manutencao.interface';
import { DiarioBordo } from '../../../models/diario-bordo.interface';
import { ViagensService } from '../../../services/viagens.service';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { ParadasService } from '../../../services/paradas.service';
import { HospedagensService } from '../../../services/hospedagens.service';
import { CustosService } from '../../../services/custos.service';
import { ManutencoesService } from '../../../services/manutencoes.service';
import { DiarioBordoService } from '../../../services/diario-bordo.service';

// Componentes
import { ViagemFormComponent } from '../viagem-form/viagem-form.component';
import { DiaViagemCardComponent } from '../../dias-viagem/dia-viagem-card/dia-viagem-card.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components';
import { ParadaFormDialogComponent, ParadaFormDialogData } from '../../paradas/parada-form-dialog/parada-form-dialog.component';
import { ParadaDetailDialogComponent, ParadaDetailDialogData } from '../../paradas/parada-detail-dialog/parada-detail-dialog.component';
import { SelectDiaDialogComponent, SelectDiaDialogData } from '../../paradas/select-dia-dialog/select-dia-dialog.component';
import { HospedagemFormComponent } from '../../hospedagens/components/hospedagem-form/hospedagem-form.component';
import { HospedagemDetailDialogComponent, HospedagemDetailDialogData } from '../../hospedagens/components/hospedagem-detail-dialog/hospedagem-detail-dialog.component';
import { HospedagemCardComponent } from '../../hospedagens/components/hospedagem-card/hospedagem-card.component';
import { ParadaCardComponent } from '../../paradas/parada-card/parada-card.component';
import { CustoFormDialogComponent, CustoFormDialogData } from '../../custos/components/custo-form-dialog/custo-form-dialog.component';
import { CustoCardComponent } from '../../custos/components/custo-card/custo-card.component';
import { ManutencaoFormDialogComponent, ManutencaoFormDialogData } from '../../manutencoes/components/manutencao-form-dialog/manutencao-form-dialog.component';
import { ManutencaoCardComponent } from '../../manutencoes/components/manutencao-card/manutencao-card.component';
import { DiarioEntradaFormDialogComponent, DiarioEntradaFormDialogData } from '../../diario/components/diario-entrada-form-dialog/diario-entrada-form-dialog.component';
import { DiarioEntradaCardComponent } from '../../diario/components/diario-entrada-card/diario-entrada-card.component';
import { DiarioEntradaDetailDialogComponent } from '../../diario/components/diario-entrada-detail-dialog/diario-entrada-detail-dialog.component';
import { ClimaViagemComponent } from '../../clima/components/clima-viagem/clima-viagem.component';
import { DiaViagemDetailDialogComponent, DiaViagemDetailDialogData } from '../../dias-viagem/dia-viagem-detail-dialog/dia-viagem-detail-dialog.component';

@Component({
    selector: 'app-viagem-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
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
        MatFormFieldModule,
        MatInputModule,
        DatePipe,
        ViagemFormComponent,
        DiaViagemCardComponent,
        ParadaCardComponent,
        HospedagemCardComponent,
        CustoCardComponent,
        ManutencaoCardComponent,
        DiarioEntradaCardComponent,
        ClimaViagemComponent
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
    private manutencoesService = inject(ManutencoesService);
    private diarioBordoService = inject(DiarioBordoService);
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
    manutencoes = signal<Manutencao[]>([]);
    entradasDiario = signal<DiarioBordo[]>([]);
    entradasDiarioFiltradas = signal<DiarioBordo[]>([]);
    
    // Filtro de diário
    filtroDiarioTexto = '';

    // Estatísticas calculadas
    estatisticas = signal<{
        totalDias: number;
        totalParadas: number;
        totalHospedagens: number;
        totalManutencoes: number;
        totalEntradasDiario: number;
        custoTotal: number;
        distanciaTotal: number;
    }>({
        totalDias: 0,
        totalParadas: 0,
        totalHospedagens: 0,
        totalManutencoes: 0,
        totalEntradasDiario: 0,
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

    /**
     * Retorna ícone para tipo de hospedagem
     */
    getIconeHospedagem(tipo: string): string {
        const icons: { [key: string]: string } = {
            'hotel': 'hotel',
            'pousada': 'house',
            'hostel': 'group',
            'camping': 'nature',
            'casa-temporada': 'home',
            'apartamento': 'apartment',
            'outros': 'business'
        };
        return icons[tipo] || 'hotel';
    }

    /**
     * Retorna texto para tipo de hospedagem
     */
    getTipoHospedagemTexto(tipo: string): string {
        const labels: { [key: string]: string } = {
            'hotel': 'Hotel',
            'pousada': 'Pousada',
            'hostel': 'Hostel',
            'camping': 'Camping',
            'casa-temporada': 'Casa de Temporada',
            'apartamento': 'Apartamento',
            'outros': 'Outros'
        };
        return labels[tipo] || tipo;
    }

    /**
     * Rótulo de dia para hospedagem
     */
    getDiaLabelHospedagem(hospedagem: Hospedagem): string {
        const dia = this.diasViagem().find(d => d.id === hospedagem.diaViagemId);
        if (!dia) return 'Dia não encontrado';
        const data = this.formatarData(dia.data);
        return dia.numeroDia ? `Dia ${dia.numeroDia} • ${data}` : data;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega dados da viagem
     */
    private loadViagem(): void {
        this.isLoading.set(true);
        
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
                catchError(error => {
                    console.error('Erro ao carregar viagem:', error);
                    this.showError('Erro ao carregar dados da viagem');
                    this.isLoading.set(false);
                    this.router.navigate(['/viagens']);
                    return of(undefined);
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

        // Carregar manutenções da viagem
        this.manutencoesService.recuperarPorViagem(viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (manutencoes) => {
                    this.manutencoes.set(manutencoes);
                    this.updateEstatisticas();
                },
                error: (error) => {
                    console.error('Erro ao carregar manutenções:', error);
                }
            });

        // Carregar entradas do diário
        this.diarioBordoService.obterEntradasDaViagem(viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entradas) => {
                    this.entradasDiario.set(entradas);
                    this.filtrarEntradasDiario();
                    this.updateEstatisticas();
                },
                error: (error) => {
                    console.error('Erro ao carregar entradas do diário:', error);
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
        const manutencoes = this.manutencoes();
        const entradasDiario = this.entradasDiario();

        const distanciaTotal = dias.reduce((total, dia) => total + (dia.distanciaPercorrida || 0), 0);
        const custoTotal = custos.reduce((total, custo) => total + custo.valor, 0);

        this.estatisticas.set({
            totalDias: dias.length,
            totalParadas: paradas.length,
            totalHospedagens: hospedagens.length,
            totalManutencoes: manutencoes.length,
            totalEntradasDiario: entradasDiario.length,
            custoTotal,
            distanciaTotal
        });
    }

    /**
     * Carrega os custos da viagem
     */
    private carregarCustos(): void {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        this.custosService.listarCustosViagem(viagem.id)
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
                mensagem: this.buildExcluirMensagem(viagem, stats),
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
     * Monta a mensagem HTML para confirmação de exclusão, evitando templates aninhados
     */
    private buildExcluirMensagem(
        viagem: Viagem,
        stats: {
            totalDias: number;
            totalParadas: number;
            totalHospedagens: number;
            totalCustos: number;
            valorTotalCustos: number;
            temDadosRelacionados: boolean;
        }
    ): string {
        const listaItens: string[] = [];
        if (stats.totalDias > 0) {
            listaItens.push(`<li><strong>${stats.totalDias}</strong> ${stats.totalDias === 1 ? 'dia planejado' : 'dias planejados'}</li>`);
        }
        if (stats.totalParadas > 0) {
            listaItens.push(`<li><strong>${stats.totalParadas}</strong> ${stats.totalParadas === 1 ? 'parada registrada' : 'paradas registradas'}</li>`);
        }
        if (stats.totalHospedagens > 0) {
            listaItens.push(`<li><strong>${stats.totalHospedagens}</strong> ${stats.totalHospedagens === 1 ? 'hospedagem' : 'hospedagens'}</li>`);
        }
        if (stats.totalCustos > 0) {
            listaItens.push(`<li><strong>${stats.totalCustos}</strong> ${stats.totalCustos === 1 ? 'registro de custo' : 'registros de custos'} (${this.formatarMoeda(stats.valorTotalCustos)})</li>`);
        }

        const dadosRelacionados = stats.temDadosRelacionados
            ? (
                '<p>Os seguintes dados serão <strong>permanentemente removidos</strong>:</p>' +
                `<ul style="margin: 12px 0; padding-left: 20px; line-height: 1.6;">${listaItens.join('')}</ul>` +
                '<div style="background-color: #ffebee; padding: 12px; border-radius: 4px; margin: 16px 0;">' +
                '<p style="margin: 0; color: #c62828; font-weight: 500;">🗑️ Todos estes dados serão perdidos permanentemente!</p>' +
                '</div>'
            )
            : (
                '<div style="background-color: #e8f5e8; padding: 12px; border-radius: 4px; margin: 16px 0;">' +
                '<p style="margin: 0; color: #2e7d32;">ℹ️ Esta viagem não possui dados relacionados.</p>' +
                '</div>'
            );

        return (
            '<div style="text-align: left;">' +
            `<p><strong>Tem certeza que deseja excluir a viagem "${viagem.nome}"?</strong></p>` +
            '<p style="color: #f44336; font-weight: 500; margin: 16px 0;">⚠️ Esta ação não pode ser desfeita!</p>' +
            dadosRelacionados +
            '<p style="font-size: 14px; color: #666; margin-top: 16px;">Digite "<strong>EXCLUIR</strong>" para confirmar que você entende que esta ação é irreversível.</p>' +
            '</div>'
        );
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
            const novaViagemBase: Viagem = {
                ...viagem,
                nome: `${viagem.nome} (Cópia)`,
                status: StatusViagem.PLANEJADA,
                custoTotal: 0,
                distanciaTotal: viagem.distanciaTotal || 0
            };

            // Montar objeto sem campos proibidos (id/usuarioId/auditoria/estatisticas)
            const dadosParaCriar: Omit<Viagem, 'id' | 'usuarioId' | 'criadoEm' | 'atualizadoEm' | 'estatisticas'> = {
                nome: novaViagemBase.nome,
                descricao: novaViagemBase.descricao,
                dataInicio: novaViagemBase.dataInicio,
                dataFim: novaViagemBase.dataFim,
                status: StatusViagem.PLANEJADA,
                origem: novaViagemBase.origem,
                destino: novaViagemBase.destino,
                distanciaTotal: novaViagemBase.distanciaTotal,
                custoTotal: novaViagemBase.custoTotal,
                numeroDias: novaViagemBase.numeroDias,
                fotos: novaViagemBase.fotos,
                observacoes: novaViagemBase.observacoes
            };

            const novaViagemId = await this.viagensService.criarViagem(dadosParaCriar);
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
            case 6: // Manutenção
                if (this.manutencoes().length === 0) {
                    this.manutencoesService.recuperarPorViagem(viagemId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(manutencoes => this.manutencoes.set(manutencoes));
                }
                break;
            case 7: // Diário
                if (this.entradasDiario().length === 0) {
                    this.diarioBordoService.obterEntradasDaViagem(viagemId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(entradas => {
                            this.entradasDiario.set(entradas);
                            this.filtrarEntradasDiario();
                        });
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
            // Navegar para o formulário de criação de novo dia
            this.router.navigate(['/viagens', viagem.id, 'dias', 'nova']);
        }
    }

    /**
     * Edita um dia específico da viagem
     */
    onEditarDia(dia: DiaViagem): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !dia.id) return;
        this.router.navigate(['/viagens', viagem.id, 'dias', dia.id, 'editar']);
    }

    /**
     * Visualiza detalhes de um dia em um diálogo
     */
    onVisualizarDia(dia: DiaViagem): void {
        const viagem = this.viagem();
        
        const dialogData: DiaViagemDetailDialogData = {
            dia: dia,
            viagemNome: viagem?.nome
        };

        this.dialog.open(DiaViagemDetailDialogComponent, {
            width: '90vw',
            maxWidth: '1200px',
            height: '85vh',
            maxHeight: '900px',
            data: dialogData,
            panelClass: 'dia-detail-dialog'
        });
    }

    /**
     * Remove um dia da viagem com confirmação e renumera os restantes
     */
    async onRemoverDia(dia: DiaViagem): Promise<void> {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !dia.id) return;

        const dialogData: ConfirmationDialogData = {
            titulo: 'Excluir Dia da Viagem',
            mensagem: `\
<div style="text-align:left;">
  <p><strong>Tem certeza que deseja excluir o Dia ${dia.numeroDia}?</strong></p>
  <p style="margin:8px 0 0 0;">${new Date(dia.data).toLocaleDateString('pt-BR')} • ${dia.origem} → ${dia.destino}</p>
  <p style="color:#f44336; font-weight:500; margin-top:12px;">Esta ação não pode ser desfeita.</p>
 </div>`,
            textoConfirmar: 'Excluir Dia',
            textoCancelar: 'Cancelar',
            tipo: 'danger',
            icone: 'delete_forever'
        };

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: dialogData,
            disableClose: true
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (confirmado) => {
            if (confirmado === true) {
                try {
                    await this.diasViagemService.remove(dia.id!);
                    await this.renumerarDias(viagem.id!);
                    // Recarregar lista local
                    const diasAtualizados = await this.diasViagemService.listarDiasViagem(viagem.id!).toPromise();
                    this.diasViagem.set(diasAtualizados || []);
                    this.updateEstatisticas();
                    this.showSuccess(`Dia ${dia.numeroDia} excluído com sucesso!`);
                } catch (error) {
                    console.error('Erro ao excluir dia:', error);
                    this.showError('Erro ao excluir dia. Tente novamente.');
                }
            }
        });
    }

    /**
     * Renumera os dias da viagem sequencialmente após exclusão/reordenação
     */
    private async renumerarDias(viagemId: string): Promise<void> {
        const dias = await this.diasViagemService.listarDiasViagem(viagemId).toPromise();
        if (!dias || dias.length === 0) return;

        const ordenados = [...dias].sort((a, b) => (a.numeroDia || 0) - (b.numeroDia || 0));
        const updates: Promise<void>[] = [];
        ordenados.forEach((d, idx) => {
            const numeroCorreto = idx + 1;
            if (d.numeroDia !== numeroCorreto && d.id) {
                updates.push(this.diasViagemService.altera(d.id, { numeroDia: numeroCorreto }));
            }
        });

        if (updates.length > 0) {
            await Promise.all(updates);
        }
    }

    onAdicionarParada(): void {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        const dias = this.diasViagem();

        // Exigir que exista ao menos um dia
        if (!dias || dias.length === 0) {
            this.showError('Você precisa criar um dia antes de adicionar uma parada.');
            this.router.navigate(['/viagens', viagem.id, 'dias', 'nova']);
            return;
        }

        const abrirFormulario = (diaId: string) => {
            const data: ParadaFormDialogData = {
                viagemId: viagem.id!,
                diaViagemId: diaId
            };

            const formRef = this.dialog.open(ParadaFormDialogComponent, {
                width: '720px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                autoFocus: false,
                data
            });

            formRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (paradaCriada: Parada | null) => {
                if (paradaCriada) {
                    // Recarregar paradas da viagem e atualizar estatísticas
                    const atualizadas = await this.paradasService.listarParadasViagem(viagem.id!).toPromise();
                    this.paradas.set(atualizadas || []);
                    this.updateEstatisticas();
                }
            });
        };

        if (dias.length === 1) {
            // Único dia: abrir direto
            const unicoDiaId = dias[0].id;
            if (unicoDiaId) abrirFormulario(unicoDiaId);
            return;
        }

        // Vários dias: abrir diálogo de seleção
        const dialogRef = this.dialog.open(SelectDiaDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: { dias } as SelectDiaDialogData,
            disableClose: false
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((diaSelecionadoId: string | null) => {
            if (diaSelecionadoId) {
                abrirFormulario(diaSelecionadoId);
            }
        });
    }

    onVisualizarParada(parada: Parada): void {
        const data: ParadaDetailDialogData = {
            parada,
            diaLabel: this.getDiaLabelParada(parada)
        };

        this.dialog.open(ParadaDetailDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data
        });
    }

    onEditarParada(parada: Parada): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !parada.id) return;

        const data: ParadaFormDialogData = {
            viagemId: viagem.id!,
            diaViagemId: parada.diaViagemId,
            parada
        };

        const formRef = this.dialog.open(ParadaFormDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data
        });

        formRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (paradaAtualizada: Parada | null) => {
            if (paradaAtualizada) {
                const atualizadas = await this.paradasService.listarParadasViagem(viagem.id!).toPromise();
                this.paradas.set(atualizadas || []);
                this.updateEstatisticas();
                this.showSuccess('Parada atualizada com sucesso!');
            }
        });
    }

    onRemoverParada(parada: Parada): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !parada.id) return;

        const dialogData: ConfirmationDialogData = {
            titulo: 'Excluir Parada',
            mensagem: `Você realmente deseja excluir a parada "${parada.nome}"? Esta ação não pode ser desfeita.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Cancelar',
            tipo: 'danger',
            icone: 'delete_forever'
        };

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: dialogData,
            disableClose: true
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (confirmado) => {
            if (confirmado === true) {
                try {
                    await this.paradasService.remove(parada.id!);
                    const atualizadas = await this.paradasService.listarParadasViagem(viagem.id!).toPromise();
                    this.paradas.set(atualizadas || []);
                    this.updateEstatisticas();
                    this.showSuccess('Parada excluída com sucesso!');
                } catch (error) {
                    console.error('Erro ao excluir parada:', error);
                    this.showError('Erro ao excluir parada. Tente novamente.');
                }
            }
        });
    }

    onAdicionarHospedagem(): void {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        const dias = this.diasViagem();
        if (!dias || dias.length === 0) {
            this.showError('Você precisa criar um dia antes de adicionar uma hospedagem.');
            this.router.navigate(['/viagens', viagem.id, 'dias', 'nova']);
            return;
        }

        const abrirFormulario = (diaId: string) => {
            const dialogRef = this.dialog.open(HospedagemFormComponent, {
                width: '800px',
                maxWidth: '95vw'
            });

            dialogRef.componentInstance.viagemId = viagem.id!;
            dialogRef.componentInstance.diaViagemId = diaId;

            dialogRef.componentInstance.hospedagemSalva.pipe(takeUntil(this.destroy$)).subscribe(async () => {
                const atualizadas = await this.hospedagensService.listarHospedagensViagem(viagem.id!).toPromise();
                this.hospedagens.set(atualizadas || []);
                this.updateEstatisticas();
                dialogRef.close();
                this.showSuccess('Hospedagem criada com sucesso!');
            });

            dialogRef.componentInstance.cancelar.pipe(takeUntil(this.destroy$)).subscribe(() => {
                dialogRef.close();
            });
        };

        if (dias.length === 1) {
            const unicoDiaId = dias[0].id;
            if (unicoDiaId) abrirFormulario(unicoDiaId);
            return;
        }

        const dialogRef = this.dialog.open(SelectDiaDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: { dias } as SelectDiaDialogData,
            disableClose: false
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((diaSelecionadoId: string | null) => {
            if (diaSelecionadoId) abrirFormulario(diaSelecionadoId);
        });
    }

    onEditarHospedagem(hospedagem: Hospedagem): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !hospedagem.id) return;

        const dialogRef = this.dialog.open(HospedagemFormComponent, {
            width: '800px',
            maxWidth: '95vw'
        });

        dialogRef.componentInstance.viagemId = viagem.id!;
        dialogRef.componentInstance.diaViagemId = hospedagem.diaViagemId;
        dialogRef.componentInstance.hospedagem = hospedagem;

        dialogRef.componentInstance.hospedagemSalva.pipe(takeUntil(this.destroy$)).subscribe(async () => {
            const atualizadas = await this.hospedagensService.listarHospedagensViagem(viagem.id!).toPromise();
            this.hospedagens.set(atualizadas || []);
            this.updateEstatisticas();
            dialogRef.close();
            this.showSuccess('Hospedagem atualizada com sucesso!');
        });

        dialogRef.componentInstance.cancelar.pipe(takeUntil(this.destroy$)).subscribe(() => {
            dialogRef.close();
        });
    }

    onRemoverHospedagem(hospedagem: Hospedagem): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !hospedagem.id) return;

        const dialogData: ConfirmationDialogData = {
            titulo: 'Excluir Hospedagem',
            mensagem: `Você realmente deseja excluir a hospedagem "${hospedagem.nome}"? Esta ação não pode ser desfeita.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Cancelar',
            tipo: 'danger',
            icone: 'delete_forever'
        };

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: dialogData,
            disableClose: true
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (confirmado) => {
            if (confirmado === true) {
                try {
                    await this.hospedagensService.remove(hospedagem.id!);
                    const atualizadas = await this.hospedagensService.listarHospedagensViagem(viagem.id!).toPromise();
                    this.hospedagens.set(atualizadas || []);
                    this.updateEstatisticas();
                    this.showSuccess('Hospedagem excluída com sucesso!');
                } catch (error) {
                    console.error('Erro ao excluir hospedagem:', error);
                    this.showError('Erro ao excluir hospedagem. Tente novamente.');
                }
            }
        });
    }

    onVisualizarHospedagem(hospedagem: Hospedagem): void {
        const data: HospedagemDetailDialogData = {
            hospedagem,
            diaLabel: this.getDiaLabelHospedagem(hospedagem)
        };

        this.dialog.open(HospedagemDetailDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data
        });
    }

    onAdicionarCusto(): void {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        const dialogData: CustoFormDialogData = {
            viagemId: viagem.id
        };

        const dialogRef = this.dialog.open(CustoFormDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(custo => {
            if (custo) {
                this.showSuccess('Custo adicionado com sucesso!');
                this.carregarCustos();
            }
        });
    }

    onEditarCusto(custo: Custo): void {
        const viagem = this.viagem();
        if (!viagem?.id || !custo.id) return;

        const dialogData: CustoFormDialogData = {
            viagemId: viagem.id,
            custo: custo
        };

        const dialogRef = this.dialog.open(CustoFormDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(custoAtualizado => {
            if (custoAtualizado) {
                this.showSuccess('Custo atualizado com sucesso!');
                this.carregarCustos();
            }
        });
    }

    async onRemoverCusto(custo: Custo): Promise<void> {
        if (!custo.id) return;

        const dialogData: ConfirmationDialogData = {
            titulo: 'Confirmar Exclusão',
            mensagem: `Deseja realmente excluir o custo "${custo.descricao}"?`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Cancelar'
        };

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '400px',
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(async confirmed => {
            if (confirmed) {
                try {
                    await this.custosService.remove(custo.id!);
                    this.showSuccess('Custo excluído com sucesso!');
                    this.carregarCustos();
                } catch (error) {
                    console.error('Erro ao excluir custo:', error);
                    this.showError('Erro ao excluir custo');
                }
            }
        });
    }

    onRegistrarManutencao(): void {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        const dialogData: ManutencaoFormDialogData = {
            viagemId: viagem.id
        };

        const dialogRef = this.dialog.open(ManutencaoFormDialogComponent, {
            width: '900px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(async (manutencao: Manutencao | null) => {
            if (manutencao) {
                this.showSuccess('Manutenção registrada com sucesso!');
                // Recarregar manutenções
                const atualizadas = await this.manutencoesService.recuperarPorViagem(viagem.id!).toPromise();
                this.manutencoes.set(atualizadas || []);
                this.updateEstatisticas();
            }
        });
    }

    onVisualizarManutencao(manutencao: Manutencao): void {
        // TODO: Implementar dialog de visualização de manutenção
        console.log('Visualizar manutenção:', manutencao.id);
        this.showSuccess('Visualização detalhada será implementada em breve');
    }

    onEditarManutencao(manutencao: Manutencao): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !manutencao.id) return;

        const dialogData: ManutencaoFormDialogData = {
            viagemId: viagem.id,
            manutencao
        };

        const dialogRef = this.dialog.open(ManutencaoFormDialogComponent, {
            width: '900px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(async (manutencaoAtualizada: Manutencao | null) => {
            if (manutencaoAtualizada) {
                this.showSuccess('Manutenção atualizada com sucesso!');
                const atualizadas = await this.manutencoesService.recuperarPorViagem(viagem.id!).toPromise();
                this.manutencoes.set(atualizadas || []);
                this.updateEstatisticas();
            }
        });
    }

    onRemoverManutencao(manutencao: Manutencao): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !manutencao.id) return;

        const dialogData: ConfirmationDialogData = {
            titulo: 'Excluir Manutenção',
            mensagem: `Você realmente deseja excluir o registro de manutenção "${manutencao.descricao}"? Esta ação não pode ser desfeita.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Cancelar',
            tipo: 'danger',
            icone: 'delete_forever'
        };

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: dialogData,
            disableClose: true
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (confirmado) => {
            if (confirmado === true) {
                try {
                    await this.manutencoesService.remove(manutencao.id!);
                    const atualizadas = await this.manutencoesService.recuperarPorViagem(viagem.id!).toPromise();
                    this.manutencoes.set(atualizadas || []);
                    this.updateEstatisticas();
                    this.showSuccess('Manutenção excluída com sucesso!');
                } catch (error) {
                    console.error('Erro ao excluir manutenção:', error);
                    this.showError('Erro ao excluir manutenção. Tente novamente.');
                }
            }
        });
    }

    onNovaEntradaDiario(): void {
        const viagem = this.viagem();
        if (!viagem?.id) return;

        const dialogData: DiarioEntradaFormDialogData = {
            viagemId: viagem.id
        };

        const dialogRef = this.dialog.open(DiarioEntradaFormDialogComponent, {
            width: '700px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(async (sucesso: boolean) => {
            if (sucesso) {
                this.showSuccess('Entrada criada com sucesso!');
                // Recarregar entradas
                const atualizadas = await this.diarioBordoService.obterEntradasDaViagem(viagem.id!).toPromise();
                this.entradasDiario.set(atualizadas || []);
                this.filtrarEntradasDiario();
                this.updateEstatisticas();
            }
        });
    }

    onVisualizarEntradaDiario(entrada: DiarioBordo): void {
        // Obter nome do dia da viagem se houver
        let nomeDiaViagem: string | undefined;
        if (entrada.diaViagemId) {
            const dia = this.diasViagem().find(d => d.id === entrada.diaViagemId);
            if (dia) {
                nomeDiaViagem = `Dia ${dia.numeroDia} - ${dia.origem} → ${dia.destino}`;
            }
        }

        // Abrir dialog de visualização detalhada
        this.dialog.open(DiarioEntradaDetailDialogComponent, {
            width: '90vw',
            maxWidth: '900px',
            maxHeight: '90vh',
            data: {
                entrada,
                nomeDiaViagem
            }
        });
    }

    onEditarEntradaDiario(entrada: DiarioBordo): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !entrada.id) return;

        const dialogData: DiarioEntradaFormDialogData = {
            viagemId: viagem.id,
            entrada
        };

        const dialogRef = this.dialog.open(DiarioEntradaFormDialogComponent, {
            width: '700px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            autoFocus: false,
            data: dialogData
        });

        dialogRef.afterClosed().subscribe(async (sucesso: boolean) => {
            if (sucesso) {
                this.showSuccess('Entrada atualizada com sucesso!');
                const atualizadas = await this.diarioBordoService.obterEntradasDaViagem(viagem.id!).toPromise();
                this.entradasDiario.set(atualizadas || []);
                this.filtrarEntradasDiario();
                this.updateEstatisticas();
            }
        });
    }

    onRemoverEntradaDiario(entrada: DiarioBordo): void {
        if (!this.podeEditar()) {
            this.showError('Esta viagem não pode ser editada.');
            return;
        }
        const viagem = this.viagem();
        if (!viagem?.id || !entrada.id) return;

        const dialogData: ConfirmationDialogData = {
            titulo: 'Excluir Entrada do Diário',
            mensagem: `Você realmente deseja excluir a entrada "${entrada.titulo || 'Sem título'}"? Esta ação não pode ser desfeita.`,
            textoConfirmar: 'Excluir',
            textoCancelar: 'Cancelar',
            tipo: 'danger',
            icone: 'delete_forever'
        };

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '520px',
            maxWidth: '95vw',
            data: dialogData,
            disableClose: true
        });

        dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(async (confirmado) => {
            if (confirmado === true) {
                try {
                    await this.diarioBordoService.removerEntrada(entrada.id!);
                    const atualizadas = await this.diarioBordoService.obterEntradasDaViagem(viagem.id!).toPromise();
                    this.entradasDiario.set(atualizadas || []);
                    this.filtrarEntradasDiario();
                    this.updateEstatisticas();
                    this.showSuccess('Entrada excluída com sucesso!');
                } catch (error) {
                    console.error('Erro ao excluir entrada:', error);
                    this.showError('Erro ao excluir entrada. Tente novamente.');
                }
            }
        });
    }

    /**
     * Filtra entradas do diário por texto
     */
    filtrarEntradasDiario(): void {
        const entradas = this.entradasDiario();
        
        if (!this.filtroDiarioTexto || this.filtroDiarioTexto.trim() === '') {
            this.entradasDiarioFiltradas.set(entradas);
            return;
        }

        const termo = this.filtroDiarioTexto.toLowerCase().trim();
        const filtradas = entradas.filter(entrada =>
            entrada.titulo?.toLowerCase().includes(termo) ||
            entrada.conteudo.toLowerCase().includes(termo) ||
            entrada.tags?.some(tag => tag.toLowerCase().includes(termo))
        );

        this.entradasDiarioFiltradas.set(filtradas);
    }

    /**
     * Limpa o filtro de diário
     */
    limparFiltroDiario(): void {
        this.filtroDiarioTexto = '';
        this.filtrarEntradasDiario();
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
                return 'two_wheeler';
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
    trackByFn(index: number, item: { id?: string }): string | number {
        return item.id ?? index;
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
     * Retorna o rótulo do dia para uma parada (ex.: "Dia 3 • 12/10/2025")
     */
    getDiaLabelParada(parada: Parada): string {
        const dia = this.diasViagem().find(d => d.id === parada.diaViagemId);
        if (!dia) return 'Dia não encontrado';
        const data = this.formatarData(dia.data);
        return dia.numeroDia ? `Dia ${dia.numeroDia} • ${data}` : data;
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