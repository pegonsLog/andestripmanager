import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ViagemDetailComponent } from './viagem-detail.component';
import { ViagensService } from '../../../services/viagens.service';
import { Viagem, StatusViagem } from '../../../models';

describe('ViagemDetailComponent', () => {
    let component: ViagemDetailComponent;
    let fixture: ComponentFixture<ViagemDetailComponent>;
    let mockViagensService: jasmine.SpyObj<ViagensService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockActivatedRoute: any;

    const mockViagem: Viagem = {
        id: 'viagem-123',
        usuarioId: 'user-123',
        nome: 'Viagem de Teste',
        descricao: 'Descrição da viagem de teste',
        dataInicio: '2024-06-01',
        dataFim: '2024-06-05',
        status: StatusViagem.PLANEJADA,
        origem: 'São Paulo',
        destino: 'Rio de Janeiro',
        distanciaTotal: 450,
        custoTotal: 1500,
        numeroDias: 5,
        criadoEm: new Date(),
        atualizadoEm: new Date()
    };

    beforeEach(async () => {
        // Criar spies para os serviços
        mockViagensService = jasmine.createSpyObj('ViagensService', [
            'recuperarPorId',
            'altera',
            'remove',
            'criarViagem',
            'atualizarStatus'
        ]);

        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        // Mock do ActivatedRoute
        mockActivatedRoute = {
            params: new BehaviorSubject({ id: 'viagem-123' })
        };

        await TestBed.configureTestingModule({
            imports: [
                ViagemDetailComponent,
                NoopAnimationsModule
            ],
            providers: [
                { provide: ViagensService, useValue: mockViagensService },
                { provide: Router, useValue: mockRouter },
                { provide: MatSnackBar, useValue: mockSnackBar },
                { provide: MatDialog, useValue: mockDialog },
                { provide: ActivatedRoute, useValue: mockActivatedRoute }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ViagemDetailComponent);
        component = fixture.componentInstance;
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    describe('Carregamento da viagem', () => {
        it('deve carregar viagem com sucesso', () => {
            mockViagensService.recuperarPorId.and.returnValue(of(mockViagem));

            fixture.detectChanges();

            expect(component.viagem()).toEqual(mockViagem);
            expect(component.isLoading()).toBeFalse();
            expect(mockViagensService.recuperarPorId).toHaveBeenCalledWith('viagem-123');
        });

        it('deve exibir erro quando viagem não for encontrada', () => {
            mockViagensService.recuperarPorId.and.returnValue(of(null));

            fixture.detectChanges();

            expect(component.viagem()).toBeNull();
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Viagem não encontrada',
                'Fechar',
                jasmine.any(Object)
            );
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens']);
        });

        it('deve tratar erro no carregamento', () => {
            const error = new Error('Erro de rede');
            mockViagensService.recuperarPorId.and.returnValue(throwError(() => error));

            fixture.detectChanges();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro ao carregar dados da viagem',
                'Fechar',
                jasmine.any(Object)
            );
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens']);
        });
    });

    describe('Ações da viagem', () => {
        beforeEach(() => {
            mockViagensService.recuperarPorId.and.returnValue(of(mockViagem));
            fixture.detectChanges();
        });

        it('deve alternar para modo de edição', () => {
            component.onEditar();
            expect(component.isEditMode()).toBeTrue();
        });

        it('deve cancelar edição', () => {
            component.isEditMode.set(true);
            component.onCancelarEdicao();
            expect(component.isEditMode()).toBeFalse();
        });

        it('deve salvar viagem editada', () => {
            const viagemAtualizada = { ...mockViagem, nome: 'Nome Atualizado' };

            component.onViagemSalva(viagemAtualizada);

            expect(component.viagem()).toEqual(viagemAtualizada);
            expect(component.isEditMode()).toBeFalse();
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Viagem atualizada com sucesso!',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve excluir viagem com confirmação', async () => {
            spyOn(window, 'confirm').and.returnValue(true);
            mockViagensService.remove.and.returnValue(Promise.resolve());

            await component.onExcluir();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockViagensService.remove).toHaveBeenCalledWith('viagem-123');
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Viagem excluída com sucesso!',
                'Fechar',
                jasmine.any(Object)
            );
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens']);
        });

        it('não deve excluir viagem sem confirmação', async () => {
            spyOn(window, 'confirm').and.returnValue(false);

            await component.onExcluir();

            expect(window.confirm).toHaveBeenCalled();
            expect(mockViagensService.remove).not.toHaveBeenCalled();
        });

        it('deve duplicar viagem', async () => {
            mockViagensService.criarViagem.and.returnValue(Promise.resolve('nova-viagem-123'));

            await component.onDuplicar();

            expect(mockViagensService.criarViagem).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    nome: 'Viagem de Teste (Cópia)',
                    status: StatusViagem.PLANEJADA
                })
            );
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Viagem duplicada com sucesso!',
                'Fechar',
                jasmine.any(Object)
            );
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens', 'nova-viagem-123']);
        });

        it('deve atualizar status da viagem', async () => {
            mockViagensService.atualizarStatus.and.returnValue(Promise.resolve());

            await component.onAtualizarStatus(StatusViagem.EM_ANDAMENTO);

            expect(mockViagensService.atualizarStatus).toHaveBeenCalledWith(
                'viagem-123',
                StatusViagem.EM_ANDAMENTO
            );
            expect(component.viagem()?.status).toBe(StatusViagem.EM_ANDAMENTO);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Status da viagem atualizado!',
                'Fechar',
                jasmine.any(Object)
            );
        });
    });

    describe('Navegação entre abas', () => {
        beforeEach(() => {
            mockViagensService.recuperarPorId.and.returnValue(of(mockViagem));
            fixture.detectChanges();
        });

        it('deve alterar aba selecionada', () => {
            component.onTabChange(2);
            expect(component.selectedTabIndex()).toBe(2);
        });

        it('deve voltar para lista de viagens', () => {
            component.onVoltar();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens']);
        });
    });

    describe('Métodos utilitários', () => {
        beforeEach(() => {
            mockViagensService.recuperarPorId.and.returnValue(of(mockViagem));
            fixture.detectChanges();
        });

        it('deve formatar data corretamente', () => {
            const dataFormatada = component.formatarData('2024-06-01');
            expect(dataFormatada).toBe('01/06/2024');
        });

        it('deve formatar moeda corretamente', () => {
            const moedaFormatada = component.formatarMoeda(1500);
            expect(moedaFormatada).toBe('R$ 1.500,00');
        });

        it('deve formatar distância corretamente', () => {
            const distanciaFormatada = component.formatarDistancia(450);
            expect(distanciaFormatada).toBe('450 km');
        });

        it('deve calcular duração da viagem', () => {
            const duracao = component.calcularDuracao(mockViagem);
            expect(duracao).toBe(5);
        });

        it('deve retornar cor correta para status', () => {
            expect(component.getCorStatus(StatusViagem.PLANEJADA)).toBe('primary');
            expect(component.getCorStatus(StatusViagem.EM_ANDAMENTO)).toBe('accent');
            expect(component.getCorStatus(StatusViagem.FINALIZADA)).toBe('warn');
        });

        it('deve retornar texto correto para status', () => {
            expect(component.getTextoStatus(StatusViagem.PLANEJADA)).toBe('Planejada');
            expect(component.getTextoStatus(StatusViagem.EM_ANDAMENTO)).toBe('Em Andamento');
            expect(component.getTextoStatus(StatusViagem.FINALIZADA)).toBe('Finalizada');
        });

        it('deve retornar ícone correto para status', () => {
            expect(component.getIconeStatus(StatusViagem.PLANEJADA)).toBe('schedule');
            expect(component.getIconeStatus(StatusViagem.EM_ANDAMENTO)).toBe('directions_bike');
            expect(component.getIconeStatus(StatusViagem.FINALIZADA)).toBe('check_circle');
        });
    });

    describe('Permissões de ação', () => {
        it('deve permitir edição para viagem não finalizada', () => {
            mockViagensService.recuperarPorId.and.returnValue(of({
                ...mockViagem,
                status: StatusViagem.PLANEJADA
            }));
            fixture.detectChanges();

            expect(component.podeEditar()).toBeTrue();
        });

        it('não deve permitir edição para viagem finalizada', () => {
            mockViagensService.recuperarPorId.and.returnValue(of({
                ...mockViagem,
                status: StatusViagem.FINALIZADA
            }));
            fixture.detectChanges();

            expect(component.podeEditar()).toBeFalse();
        });

        it('deve permitir iniciar viagem planejada', () => {
            mockViagensService.recuperarPorId.and.returnValue(of({
                ...mockViagem,
                status: StatusViagem.PLANEJADA
            }));
            fixture.detectChanges();

            expect(component.podeIniciar()).toBeTrue();
        });

        it('deve permitir finalizar viagem em andamento', () => {
            mockViagensService.recuperarPorId.and.returnValue(of({
                ...mockViagem,
                status: StatusViagem.EM_ANDAMENTO
            }));
            fixture.detectChanges();

            expect(component.podeFinalizar()).toBeTrue();
        });
    });

    describe('Tratamento de erros', () => {
        beforeEach(() => {
            mockViagensService.recuperarPorId.and.returnValue(of(mockViagem));
            fixture.detectChanges();
        });

        it('deve tratar erro ao excluir viagem', async () => {
            spyOn(window, 'confirm').and.returnValue(true);
            mockViagensService.remove.and.returnValue(Promise.reject(new Error('Erro de rede')));

            await component.onExcluir();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro ao excluir viagem. Tente novamente.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar erro ao duplicar viagem', async () => {
            mockViagensService.criarViagem.and.returnValue(Promise.reject(new Error('Erro de rede')));

            await component.onDuplicar();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro ao duplicar viagem. Tente novamente.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar erro ao atualizar status', async () => {
            mockViagensService.atualizarStatus.and.returnValue(Promise.reject(new Error('Erro de rede')));

            await component.onAtualizarStatus(StatusViagem.EM_ANDAMENTO);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro ao atualizar status da viagem.',
                'Fechar',
                jasmine.any(Object)
            );
        });
    });
});