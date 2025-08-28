import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { ViagensService } from './viagens.service';
import { AuthService } from '../core/services/auth.service';
import { DiasViagemService } from './dias-viagem.service';
import { ParadasService } from './paradas.service';
import { HospedagensService } from './hospedagens.service';
import { CustosService } from './custos.service';
import { StatusViagem } from '../models';

describe('ViagensService - Exclusão de Viagem', () => {
    let service: ViagensService;
    let mockFirestore: jasmine.SpyObj<Firestore>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockDiasViagemService: jasmine.SpyObj<DiasViagemService>;
    let mockParadasService: jasmine.SpyObj<ParadasService>;
    let mockHospedagensService: jasmine.SpyObj<HospedagensService>;
    let mockCustosService: jasmine.SpyObj<CustosService>;

    const mockUsuario = {
        id: 'user-123',
        nome: 'João Silva',
        email: 'joao@teste.com',
        usuarioId: 'user-123',
        criadoEm: new Date() as any,
        atualizadoEm: new Date() as any
    };

    const mockViagem = {
        id: 'viagem-123',
        usuarioId: 'user-123',
        nome: 'Viagem de Teste',
        descricao: 'Descrição da viagem',
        dataInicio: '2024-06-01',
        dataFim: '2024-06-05',
        status: StatusViagem.PLANEJADA,
        criadoEm: new Date() as any,
        atualizadoEm: new Date() as any
    };

    beforeEach(() => {
        const firestoreSpy = jasmine.createSpyObj('Firestore', ['collection', 'doc']);
        const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
        const diasViagemServiceSpy = jasmine.createSpyObj('DiasViagemService', ['listarDiasViagem', 'remove', 'novo']);
        const paradasServiceSpy = jasmine.createSpyObj('ParadasService', ['listarParadasViagem', 'remove', 'novo']);
        const hospedagensServiceSpy = jasmine.createSpyObj('HospedagensService', ['listarHospedagensViagem', 'remove', 'novo']);
        const custosServiceSpy = jasmine.createSpyObj('CustosService', ['listarCustosViagem', 'remove', 'novo']);

        TestBed.configureTestingModule({
            providers: [
                ViagensService,
                { provide: Firestore, useValue: firestoreSpy },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: DiasViagemService, useValue: diasViagemServiceSpy },
                { provide: ParadasService, useValue: paradasServiceSpy },
                { provide: HospedagensService, useValue: hospedagensServiceSpy },
                { provide: CustosService, useValue: custosServiceSpy }
            ]
        });

        service = TestBed.inject(ViagensService);
        mockFirestore = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        mockDiasViagemService = TestBed.inject(DiasViagemService) as jasmine.SpyObj<DiasViagemService>;
        mockParadasService = TestBed.inject(ParadasService) as jasmine.SpyObj<ParadasService>;
        mockHospedagensService = TestBed.inject(HospedagensService) as jasmine.SpyObj<HospedagensService>;
        mockCustosService = TestBed.inject(CustosService) as jasmine.SpyObj<CustosService>;

        // Setup mocks
        mockAuthService.getCurrentUser.and.returnValue(mockUsuario);
    });

    it('deve ser criado', () => {
        expect(service).toBeTruthy();
    });

    it('deve lançar erro se usuário não estiver autenticado', async () => {
        mockAuthService.getCurrentUser.and.returnValue(null);

        await expectAsync(service.excluirViagemCompleta('viagem-123'))
            .toBeRejectedWithError('Usuário não autenticado');
    });

    it('deve validar se a viagem pertence ao usuário', async () => {
        // Mock para recuperarPorId retornar uma viagem de outro usuário
        spyOn(service, 'recuperarPorId').and.returnValue({
            pipe: () => ({
                toPromise: () => Promise.resolve({
                    ...mockViagem,
                    usuarioId: 'outro-usuario'
                })
            })
        } as any);

        await expectAsync(service.excluirViagemCompleta('viagem-123'))
            .toBeRejectedWithError('Você não tem permissão para excluir esta viagem');
    });

    it('deve lançar erro se viagem não for encontrada', async () => {
        spyOn(service, 'recuperarPorId').and.returnValue({
            pipe: () => ({
                toPromise: () => Promise.resolve(null)
            })
        } as any);

        await expectAsync(service.excluirViagemCompleta('viagem-123'))
            .toBeRejectedWithError('Viagem não encontrada');
    });

    describe('Exclusão bem-sucedida', () => {
        beforeEach(() => {
            // Mock para recuperarPorId retornar a viagem válida
            spyOn(service, 'recuperarPorId').and.returnValue({
                pipe: () => ({
                    toPromise: () => Promise.resolve(mockViagem)
                })
            } as any);

            // Mock para remove da viagem
            spyOn(service, 'remove').and.returnValue(Promise.resolve());

            // Mocks para serviços relacionados retornarem listas vazias
            mockDiasViagemService.listarDiasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockParadasService.listarParadasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockHospedagensService.listarHospedagensViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockCustosService.listarCustosViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);
        });

        it('deve excluir viagem sem dados relacionados', async () => {
            await expectAsync(service.excluirViagemCompleta('viagem-123'))
                .toBeResolved();

            expect(service.remove).toHaveBeenCalledWith('viagem-123');
        });

        it('deve excluir dados relacionados antes da viagem', async () => {
            const mockDias = [{ id: 'dia-1' }, { id: 'dia-2' }];
            const mockParadas = [{ id: 'parada-1' }];
            const mockHospedagens = [{ id: 'hospedagem-1' }];
            const mockCustos = [{ id: 'custo-1', valor: 100 }];

            mockDiasViagemService.listarDiasViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockDias)
            } as any);

            mockParadasService.listarParadasViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockParadas)
            } as any);

            mockHospedagensService.listarHospedagensViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockHospedagens)
            } as any);

            mockCustosService.listarCustosViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockCustos)
            } as any);

            mockDiasViagemService.remove.and.returnValue(Promise.resolve());
            mockParadasService.remove.and.returnValue(Promise.resolve());
            mockHospedagensService.remove.and.returnValue(Promise.resolve());
            mockCustosService.remove.and.returnValue(Promise.resolve());

            await expectAsync(service.excluirViagemCompleta('viagem-123'))
                .toBeResolved();

            // Verificar se todos os dados relacionados foram excluídos
            expect(mockCustosService.remove).toHaveBeenCalledWith('custo-1');
            expect(mockHospedagensService.remove).toHaveBeenCalledWith('hospedagem-1');
            expect(mockParadasService.remove).toHaveBeenCalledWith('parada-1');
            expect(mockDiasViagemService.remove).toHaveBeenCalledWith('dia-1');
            expect(mockDiasViagemService.remove).toHaveBeenCalledWith('dia-2');

            // Verificar se a viagem foi excluída por último
            expect(service.remove).toHaveBeenCalledWith('viagem-123');
        });

        it('deve obter estatísticas da viagem corretamente', async () => {
            const mockDias = [{ id: 'dia-1' }, { id: 'dia-2' }];
            const mockParadas = [{ id: 'parada-1' }];
            const mockHospedagens = [{ id: 'hospedagem-1' }];
            const mockCustos = [{ id: 'custo-1', valor: 100 }, { id: 'custo-2', valor: 50 }];

            mockDiasViagemService.listarDiasViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockDias)
            } as any);

            mockParadasService.listarParadasViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockParadas)
            } as any);

            mockHospedagensService.listarHospedagensViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockHospedagens)
            } as any);

            mockCustosService.listarCustosViagem.and.returnValue({
                toPromise: () => Promise.resolve(mockCustos)
            } as any);

            const estatisticas = await service.obterEstatisticasViagem('viagem-123');

            expect(estatisticas).toEqual({
                totalDias: 2,
                totalParadas: 1,
                totalHospedagens: 1,
                totalCustos: 2,
                valorTotalCustos: 150,
                temDadosRelacionados: true
            });
        });
    });

    describe('Tratamento de erros e rollback', () => {
        beforeEach(() => {
            spyOn(service, 'recuperarPorId').and.returnValue({
                pipe: () => ({
                    toPromise: () => Promise.resolve(mockViagem)
                })
            } as any);

            // Mocks para coleta de backup
            mockDiasViagemService.listarDiasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockParadasService.listarParadasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockHospedagensService.listarHospedagensViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockCustosService.listarCustosViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);
        });

        it('deve fazer rollback em caso de erro na exclusão', async () => {
            // Simular erro na exclusão da viagem
            spyOn(service, 'remove').and.returnValue(Promise.reject(new Error('Erro de rede')));
            spyOn(service, 'novo').and.returnValue(Promise.resolve('restored-id'));

            await expectAsync(service.excluirViagemCompleta('viagem-123'))
                .toBeRejectedWithError('Erro ao excluir viagem: Erro de rede');

            // Verificar se tentou restaurar a viagem
            expect(service.novo).toHaveBeenCalled();
        });

        it('deve lançar erro crítico se rollback falhar', async () => {
            // Simular erro na exclusão da viagem
            spyOn(service, 'remove').and.returnValue(Promise.reject(new Error('Erro de rede')));
            // Simular erro no rollback
            spyOn(service, 'novo').and.returnValue(Promise.reject(new Error('Erro no rollback')));

            await expectAsync(service.excluirViagemCompleta('viagem-123'))
                .toBeRejectedWithError(/Erro crítico durante exclusão/);
        });

        it('deve tratar erros específicos com mensagens apropriadas', async () => {
            // Simular erro de permissão
            spyOn(service, 'remove').and.returnValue(Promise.reject({ message: 'permission-denied' }));
            spyOn(service, 'novo').and.returnValue(Promise.resolve('restored-id'));

            await expectAsync(service.excluirViagemCompleta('viagem-123'))
                .toBeRejectedWithError('Erro ao excluir viagem: Você não tem permissão para excluir esta viagem');
        });

        it('deve tratar erro de rede com mensagem apropriada', async () => {
            // Simular erro de rede
            spyOn(service, 'remove').and.returnValue(Promise.reject({ message: 'network error' }));
            spyOn(service, 'novo').and.returnValue(Promise.resolve('restored-id'));

            await expectAsync(service.excluirViagemCompleta('viagem-123'))
                .toBeRejectedWithError('Erro ao excluir viagem: Erro de conexão. Verifique sua internet e tente novamente');
        });
    });

    describe('Obtenção de estatísticas', () => {
        it('deve retornar estatísticas vazias em caso de erro', async () => {
            mockDiasViagemService.listarDiasViagem.and.returnValue({
                toPromise: () => Promise.reject(new Error('Erro de rede'))
            } as any);

            mockParadasService.listarParadasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockHospedagensService.listarHospedagensViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockCustosService.listarCustosViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            const estatisticas = await service.obterEstatisticasViagem('viagem-123');

            expect(estatisticas).toEqual({
                totalDias: 0,
                totalParadas: 0,
                totalHospedagens: 0,
                totalCustos: 0,
                valorTotalCustos: 0,
                temDadosRelacionados: false
            });
        });

        it('deve identificar corretamente quando não há dados relacionados', async () => {
            mockDiasViagemService.listarDiasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockParadasService.listarParadasViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockHospedagensService.listarHospedagensViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            mockCustosService.listarCustosViagem.and.returnValue({
                toPromise: () => Promise.resolve([])
            } as any);

            const estatisticas = await service.obterEstatisticasViagem('viagem-123');

            expect(estatisticas.temDadosRelacionados).toBeFalse();
        });
    });
});