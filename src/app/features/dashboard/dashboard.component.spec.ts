import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of, throwError } from 'rxjs';

// Componente a ser testado
import { DashboardComponent } from './dashboard.component';

// Utilitários de teste
import {
    TestHelper,
    MockDataFactory,
    FirebaseMocks,
    createComponentTestConfig
} from '../../testing/test-utils';

// Models e Services
import { Viagem, StatusViagem, Usuario } from '../../models';
import { ViagensService } from '../../services/viagens.service';
import { AuthService } from '../../core/services/auth.service';

// Angular Material
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;
    let mockViagensService: jasmine.SpyObj<ViagensService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
    let mockViagens: Viagem[];
    let mockUsuario: Usuario;

    beforeEach(async () => {
        // Criar mocks
        mockViagens = MockDataFactory.createViagens(5);
        mockUsuario = MockDataFactory.createUsuario();
        mockViagensService = FirebaseMocks.createViagensService() as jasmine.SpyObj<ViagensService>;
        mockAuthService = FirebaseMocks.createAuthService() as jasmine.SpyObj<AuthService>;
        mockRouter = FirebaseMocks.createRouter() as jasmine.SpyObj<Router>;
        mockDialog = FirebaseMocks.createMatDialog() as jasmine.SpyObj<MatDialog>;
        mockSnackBar = FirebaseMocks.createMatSnackBar() as jasmine.SpyObj<MatSnackBar>;

        // Configurar retornos dos mocks
        mockViagensService.listarViagensUsuario.and.returnValue(of(mockViagens));
        mockAuthService.currentUser$ = new BehaviorSubject(mockUsuario);

        await TestBed.configureTestingModule(
            createComponentTestConfig({
                component: DashboardComponent,
                imports: [DashboardComponent],
                providers: [
                    { provide: ViagensService, useValue: mockViagensService },
                    { provide: AuthService, useValue: mockAuthService },
                    { provide: Router, useValue: mockRouter },
                    { provide: MatDialog, useValue: mockDialog },
                    { provide: MatSnackBar, useValue: mockSnackBar }
                ]
            })
        ).compileComponents();

        fixture = TestBed.createComponent(DashboardComponent);
        component = fixture.componentInstance;
    });

    describe('Inicialização do Componente', () => {
        it('deve criar o componente', () => {
            expect(component).toBeTruthy();
        });

        it('deve carregar dados do dashboard na inicialização', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(mockViagensService.listarViagensUsuario).toHaveBeenCalled();
            expect(component.viagens$.value).toEqual(mockViagens);
        }));

        it('deve configurar filtros na inicialização', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(component.searchControl).toBeDefined();
            expect(component.statusFilter$.value).toBe('todas');
            expect(component.sortBy$.value).toBe('dataInicio');
            expect(component.sortDirection$.value).toBe('desc');
        }));

        it('deve definir isLoading como false após carregar dados', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            expect(component.isLoading$.value).toBe(false);
        }));
    });

    describe('Carregamento de Dados', () => {
        it('deve exibir loading spinner durante carregamento', () => {
            component.isLoading$.next(true);
            fixture.detectChanges();

            const spinner = TestHelper.getBySelector(fixture, 'mat-spinner');
            expect(spinner).toBeTruthy();
        });

        it('deve ocultar loading spinner após carregamento', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            const spinner = TestHelper.getBySelector(fixture, 'mat-spinner');
            expect(spinner).toBeFalsy();
        }));

        it('deve tratar erro no carregamento de dados', fakeAsync(() => {
            const errorMessage = 'Erro ao carregar viagens';
            mockViagensService.listarViagensUsuario.and.returnValue(throwError(errorMessage));

            fixture.detectChanges();
            tick();

            expect(component.error$.value).toBe('Erro ao carregar viagens. Tente novamente.');
            expect(component.isLoading$.value).toBe(false);
        }));

        it('deve recarregar dados quando solicitado', fakeAsync(() => {
            fixture.detectChanges();
            tick();

            // Reset spy
            mockViagensService.listarViagensUsuario.calls.reset();

            component.recarregarDados();
            tick();

            expect(mockViagensService.listarViagensUsuario).toHaveBeenCalled();
        }));
    });

    describe('Cálculo de Estatísticas', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            tick();
        }));

        it('deve calcular total de viagens corretamente', () => {
            const stats = component.estatisticas$.value;
            expect(stats.totalViagens).toBe(mockViagens.length);
        });

        it('deve calcular viagens por status corretamente', () => {
            const stats = component.estatisticas$.value;
            const viagensEmAndamento = mockViagens.filter(v => v.status === StatusViagem.EM_ANDAMENTO).length;
            const viagensPlanejadas = mockViagens.filter(v => v.status === StatusViagem.PLANEJADA).length;
            const viagensFinalizadas = mockViagens.filter(v => v.status === StatusViagem.FINALIZADA).length;

            expect(stats.viagensEmAndamento).toBe(viagensEmAndamento);
            expect(stats.viagensPlanejadas).toBe(viagensPlanejadas);
            expect(stats.viagensFinalizadas).toBe(viagensFinalizadas);
        });

        it('deve calcular distância total corretamente', () => {
            const stats = component.estatisticas$.value;
            const distanciaEsperada = mockViagens.reduce((total, v) => total + (v.distanciaTotal || 0), 0);
            expect(stats.distanciaTotal).toBe(distanciaEsperada);
        });

        it('deve calcular custo total corretamente', () => {
            const stats = component.estatisticas$.value;
            const custoEsperado = mockViagens.reduce((total, v) => total + (v.custoTotal || 0), 0);
            expect(stats.custoTotal).toBe(custoEsperado);
        });
    });

    describe('Filtros e Busca', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            tick();
        }));

        it('deve filtrar viagens por nome', fakeAsync(() => {
            const termoBusca = 'Viagem 1';
            component.searchControl.setValue(termoBusca);
            tick(300); // Debounce time

            const viagensFiltradas = component.viagensFiltradas$.value;
            expect(viagensFiltradas.every(v =>
                v.nome.toLowerCase().includes(termoBusca.toLowerCase())
            )).toBe(true);
        }));

        it('deve filtrar viagens por status', fakeAsync(() => {
            component.alterarFiltroStatus(StatusViagem.PLANEJADA);
            tick();

            const viagensFiltradas = component.viagensFiltradas$.value;
            expect(viagensFiltradas.every(v => v.status === StatusViagem.PLANEJADA)).toBe(true);
        }));

        it('deve ordenar viagens por nome', fakeAsync(() => {
            component.alterarOrdenacao('nome');
            tick();

            const viagensFiltradas = component.viagensFiltradas$.value;
            const nomesOrdenados = viagensFiltradas.map(v => v.nome);
            const nomesEsperados = [...nomesOrdenados].sort().reverse(); // desc por padrão
            expect(nomesOrdenados).toEqual(nomesEsperados);
        }));

        it('deve alternar direção da ordenação', fakeAsync(() => {
            // Primeira chamada - desc
            component.alterarOrdenacao('nome');
            tick();
            expect(component.sortDirection$.value).toBe('desc');

            // Segunda chamada no mesmo campo - asc
            component.alterarOrdenacao('nome');
            tick();
            expect(component.sortDirection$.value).toBe('asc');
        }));

        it('deve limpar todos os filtros', fakeAsync(() => {
            // Aplicar filtros
            component.searchControl.setValue('teste');
            component.alterarFiltroStatus(StatusViagem.PLANEJADA);
            component.alterarOrdenacao('nome');
            tick();

            // Limpar filtros
            component.limparFiltros();
            tick();

            expect(component.searchControl.value).toBe('');
            expect(component.statusFilter$.value).toBe('todas');
            expect(component.sortBy$.value).toBe('dataInicio');
            expect(component.sortDirection$.value).toBe('desc');
            expect(component.currentPage$.value).toBe(0);
        }));

        it('deve identificar quando há filtros ativos', fakeAsync(() => {
            // Sem filtros
            expect(component.hasFiltrosAtivos()).toBe(false);

            // Com busca
            component.searchControl.setValue('teste');
            tick();
            expect(component.hasFiltrosAtivos()).toBe(true);

            // Limpar busca, adicionar filtro de status
            component.searchControl.setValue('');
            component.alterarFiltroStatus(StatusViagem.PLANEJADA);
            tick();
            expect(component.hasFiltrosAtivos()).toBe(true);
        }));
    });

    describe('Paginação', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            tick();
        }));

        it('deve aplicar paginação corretamente', fakeAsync(() => {
            const viagensPaginadas = component.viagensPaginadas$.value;
            expect(viagensPaginadas.length).toBeLessThanOrEqual(component.pageSize);
        }));

        it('deve mudar página corretamente', fakeAsync(() => {
            const pageEvent: PageEvent = {
                pageIndex: 1,
                pageSize: component.pageSize,
                length: mockViagens.length
            };

            component.onPageChange(pageEvent);
            tick();

            expect(component.currentPage$.value).toBe(1);
        }));

        it('deve resetar página ao aplicar filtros', fakeAsync(() => {
            // Ir para página 2
            component.currentPage$.next(1);
            tick();

            // Aplicar filtro
            component.alterarFiltroStatus(StatusViagem.PLANEJADA);
            tick();

            expect(component.currentPage$.value).toBe(0);
        }));
    });

    describe('Navegação', () => {
        it('deve navegar para criação de nova viagem', () => {
            component.criarNovaViagem();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens/nova']);
        });

        it('deve navegar para lista completa de viagens', () => {
            component.verTodasViagens();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens']);
        });

        it('deve navegar para detalhes de uma viagem', () => {
            const viagemId = 'viagem-123';
            component.verDetalhesViagem(viagemId);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens', viagemId]);
        });

        it('deve navegar para edição de viagem', () => {
            const viagemId = 'viagem-123';
            component.onEditarViagem(viagemId);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens', viagemId, 'editar']);
        });
    });

    describe('Exclusão de Viagem', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            tick();
        }));

        it('deve abrir dialog de confirmação para exclusão', fakeAsync(() => {
            const viagemId = mockViagens[0].id!;

            component.onExcluirViagem(viagemId);
            tick();

            expect(mockDialog.open).toHaveBeenCalled();
        }));

        it('deve excluir viagem quando confirmado', fakeAsync(() => {
            const viagemId = mockViagens[0].id!;

            // Mock dialog retornando true (confirmação)
            mockDialog.open.and.returnValue({
                afterClosed: () => of(true)
            } as any);

            component.onExcluirViagem(viagemId);
            tick();

            expect(mockViagensService.excluirViagemCompleta).toHaveBeenCalledWith(viagemId);
        }));

        it('não deve excluir viagem quando cancelado', fakeAsync(() => {
            const viagemId = mockViagens[0].id!;

            // Mock dialog retornando false (cancelamento)
            mockDialog.open.and.returnValue({
                afterClosed: () => of(false)
            } as any);

            component.onExcluirViagem(viagemId);
            tick();

            expect(mockViagensService.excluirViagemCompleta).not.toHaveBeenCalled();
        }));

        it('deve exibir mensagem de sucesso após exclusão', fakeAsync(() => {
            const viagemId = mockViagens[0].id!;

            mockDialog.open.and.returnValue({
                afterClosed: () => of(true)
            } as any);
            mockViagensService.excluirViagemCompleta.and.returnValue(Promise.resolve());

            component.onExcluirViagem(viagemId);
            tick();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                jasmine.stringMatching(/excluída com sucesso/),
                'Fechar',
                jasmine.any(Object)
            );
        }));

        it('deve exibir mensagem de erro em caso de falha', fakeAsync(() => {
            const viagemId = mockViagens[0].id!;

            mockDialog.open.and.returnValue({
                afterClosed: () => of(true)
            } as any);
            mockViagensService.excluirViagemCompleta.and.returnValue(
                Promise.reject(new Error('Erro de teste'))
            );

            component.onExcluirViagem(viagemId);
            tick();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                jasmine.stringMatching(/Erro/),
                'Fechar',
                jasmine.any(Object)
            );
        }));

        it('deve tratar erro quando viagem não encontrada', fakeAsync(() => {
            const viagemIdInexistente = 'viagem-inexistente';

            component.onExcluirViagem(viagemIdInexistente);
            tick();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Viagem não encontrada',
                'Fechar',
                jasmine.any(Object)
            );
        }));
    });

    describe('Formatação de Dados', () => {
        it('deve formatar data corretamente', () => {
            const dataFormatada = component.formatarData('2024-06-01');
            expect(dataFormatada).toBe('01/06/2024');
        });

        it('deve formatar moeda corretamente', () => {
            const moedaFormatada = component.formatarMoeda(1500.50);
            expect(moedaFormatada).toBe('R$ 1.500,50');
        });

        it('deve formatar distância corretamente', () => {
            const distanciaFormatada = component.formatarDistancia(1500);
            expect(distanciaFormatada).toBe('1.500 km');
        });
    });

    describe('Status da Viagem', () => {
        it('deve retornar cor correta para cada status', () => {
            expect(component.getCorStatus(StatusViagem.PLANEJADA)).toBe('primary');
            expect(component.getCorStatus(StatusViagem.EM_ANDAMENTO)).toBe('accent');
            expect(component.getCorStatus(StatusViagem.FINALIZADA)).toBe('warn');
        });

        it('deve retornar texto correto para cada status', () => {
            expect(component.getTextoStatus(StatusViagem.PLANEJADA)).toBe('Planejada');
            expect(component.getTextoStatus(StatusViagem.EM_ANDAMENTO)).toBe('Em Andamento');
            expect(component.getTextoStatus(StatusViagem.FINALIZADA)).toBe('Finalizada');
        });

        it('deve retornar texto correto para filtro de status', () => {
            expect(component.getTextoFiltroStatus('todas')).toBe('Todas');
            expect(component.getTextoFiltroStatus(StatusViagem.PLANEJADA)).toBe('Planejada');
        });
    });

    describe('Ordenação', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            tick();
        }));

        it('deve retornar tooltip correto para ordenação', () => {
            component.sortDirection$.next('asc');
            expect(component.getTooltipOrdenacao()).toBe('Crescente');

            component.sortDirection$.next('desc');
            expect(component.getTooltipOrdenacao()).toBe('Decrescente');
        });

        it('deve retornar ícone correto para ordenação', () => {
            component.sortDirection$.next('asc');
            expect(component.getIconeOrdenacao()).toBe('arrow_upward');

            component.sortDirection$.next('desc');
            expect(component.getIconeOrdenacao()).toBe('arrow_downward');
        });

        it('deve alternar direção da ordenação atual', fakeAsync(() => {
            component.sortBy$.next('nome');
            component.sortDirection$.next('asc');

            component.alterarDirecaoOrdenacao();
            tick();

            expect(component.sortDirection$.value).toBe('desc');
        }));
    });

    describe('TrackBy Functions', () => {
        it('deve retornar ID da viagem para trackBy', () => {
            const viagem = mockViagens[0];
            const result = component.trackByViagemId(0, viagem);
            expect(result).toBe(viagem.id);
        });

        it('deve retornar índice quando viagem não tem ID', () => {
            const viagemSemId = { ...mockViagens[0], id: undefined };
            const result = component.trackByViagemId(5, viagemSemId as Viagem);
            expect(result).toBe('5');
        });
    });

    describe('Renderização do Template', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            tick();
        }));

        it('deve exibir estatísticas no dashboard', () => {
            const totalViagensElement = TestHelper.getBySelector(fixture, '[data-test="total-viagens"]');
            expect(totalViagensElement?.textContent).toContain(mockViagens.length.toString());
        });

        it('deve exibir cards de viagens', () => {
            const viagemCards = TestHelper.getAllBySelector(fixture, 'app-viagem-card');
            expect(viagemCards.length).toBeGreaterThan(0);
        });

        it('deve exibir botão de nova viagem', () => {
            const novaViagemButton = TestHelper.getBySelector(fixture, '[data-test="nova-viagem-button"]');
            expect(novaViagemButton).toBeTruthy();
        });

        it('deve exibir controles de filtro', () => {
            const searchInput = TestHelper.getBySelector(fixture, '[data-test="search-input"]');
            const statusFilter = TestHelper.getBySelector(fixture, '[data-test="status-filter"]');

            expect(searchInput).toBeTruthy();
            expect(statusFilter).toBeTruthy();
        });

        it('deve exibir paginação quando necessário', () => {
            // Simular muitas viagens para ativar paginação
            const muitasViagens = MockDataFactory.createViagens(20);
            component.viagensFiltradas$.next(muitasViagens);
            component.totalItems$.next(muitasViagens.length);
            fixture.detectChanges();

            const paginator = TestHelper.getBySelector(fixture, 'mat-paginator');
            expect(paginator).toBeTruthy();
        });
    });

    describe('Responsividade', () => {
        it('deve adaptar layout para dispositivos móveis', () => {
            // Simular viewport móvel
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 600
            });

            fixture.detectChanges();

            const container = TestHelper.getBySelector(fixture, '.dashboard-container');
            expect(container.classList.contains('mobile')).toBe(true);
        });
    });

    describe('Cleanup', () => {
        it('deve fazer cleanup dos observables no ngOnDestroy', () => {
            spyOn(component['destroy$'], 'next');
            spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(component['destroy$'].next).toHaveBeenCalled();
            expect(component['destroy$'].complete).toHaveBeenCalled();
        });
    });
});