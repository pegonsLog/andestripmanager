/**
 * Testes de Integração - ViagensService
 * 
 * Testa a integração do ViagensService com Firestore, AuthService e outros serviços,
 * incluindo operações CRUD, exclusão completa com rollback e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { ViagensService } from './viagens.service';
import { AuthService } from '../core/services/auth.service';
import { DiasViagemService } from './dias-viagem.service';
import { ParadasService } from './paradas.service';
import { HospedagensService } from './hospedagens.service';
import { CustosService } from './custos.service';
import { Viagem, StatusViagem, Usuario } from '../models';
import { MockDataFactory } from '../testing/test-utils';

describe('ViagensService - Testes de Integração', () => {
    let service: ViagensService;
    let mockFirestore: any;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockDiasViagemService: jasmine.SpyObj<DiasViagemService>;
    let mockParadasService: jasmine.SpyObj<ParadasService>;
    let mockHospedagensService: jasmine.SpyObj<HospedagensService>;
    let mockCustosService: jasmine.SpyObj<CustosService>;

    const mockUsuario: Usuario = MockDataFactory.createUsuario();
    const mockViagem: Viagem = MockDataFactory.createViagem();
    const mockViagens: Viagem[] = MockDataFactory.createViagens(3);

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-viagem-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockViagem.id,
                data: () => mockViagem
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: mockViagens.map(v => ({
                    id: v.id,
                    data: () => v
                }))
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({})
        };

        // Mock dos serviços
        const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
        const diasSpy = jasmine.createSpyObj('DiasViagemService', ['listarDiasViagem', 'remove']);
        const paradasSpy = jasmine.createSpyObj('ParadasService', ['listarParadasViagem', 'remove']);
        const hospedagensSpy = jasmine.createSpyObj('HospedagensService', ['listarHospedagensViagem', 'remove']);
        const custosSpy = jasmine.createSpyObj('CustosService', ['listarCustosViagem', 'remove']);

        TestBed.configureTestingModule({
            providers: [
                ViagensService,
                { provide: Firestore, useValue: mockFirestore },
                { provide: AuthService, useValue: authSpy },
                { provide: DiasViagemService, useValue: diasSpy },
                { provide: ParadasService, useValue: paradasSpy },
                { provide: HospedagensService, useValue: hospedagensSpy },
                { provide: CustosService, useValue: custosSpy }
            ]
        });

        service = TestBed.inject(ViagensService);
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        mockDiasViagemService = TestBed.inject(DiasViagemService) as jasmine.SpyObj<DiasViagemService>;
        mockParadasService = TestBed.inject(ParadasService) as jasmine.SpyObj<ParadasService>;
        mockHospedagensService = TestBed.inject(HospedagensService) as jasmine.SpyObj<HospedagensService>;
        mockCustosService = TestBed.inject(CustosService) as jasmine.SpyObj<CustosService>;

        // Configurar usuário autenticado por padrão
        mockAuthService.getCurrentUser.and.returnValue(mockUsuario);
    });

    describe('Integração com AuthService', () => {
        it('deve listar viagens apenas do usuário autenticado', (done) => {
            service.listarViagensUsuario().subscribe(viagens => {
                expect(viagens).toEqual(mockViagens);
                expect(mockFirestore.where).toHaveBeenCalledWith('usuarioId', '==', mockUsuario.id);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('dataInicio', 'desc');
                done();
            });
        });

        it('deve lançar erro se usuário não estiver autenticado', () => {
            mockAuthService.getCurrentUser.and.returnValue(null);

            expect(() => service.listarViagensUsuario()).toThrowError('Usuário não autenticado');
        });

        it('deve criar viagem com usuarioId do usuário autenticado', async () => {
            const dadosViagem = {
                nome: 'Nova Viagem',
                descricao: 'Descrição da viagem',
                dataInicio: '2024-06-01',
                dataFim: '2024-06-05'
            };

            const viagemId = await service.criarViagem(dadosViagem);

            expect(viagemId).toBe('new-viagem-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.usuarioId).toBe(mockUsuario.id);
            expect(dadosPassados.status).toBe(StatusViagem.PLANEJADA);
        });
    });

    describe('Operações CRUD com Firestore', () => {
        it('deve buscar viagens por nome usando filtro local', (done) => {
            const nomeParaBuscar = 'Viagem';

            service.buscarPorNome(nomeParaBuscar).subscribe(viagens => {
                const viagensFiltradas = viagens.filter(v =>
                    v.nome.toLowerCase().includes(nomeParaBuscar.toLowerCase())
                );
                expect(viagens).toEqual(viagensFiltradas);
                done();
            });
        });

        it('deve listar viagens por status', (done) => {
            const status = StatusViagem.PLANEJADA;

            service.listarPorStatus(status).subscribe(viagens => {
                expect(mockFirestore.where).toHaveBeenCalledWith('usuarioId', '==', mockUsuario.id);
                expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', status);
                done();
            });
        });

        it('deve atualizar status da viagem', async () => {
            const novoStatus = StatusViagem.EM_ANDAMENTO;

            await service.atualizarStatus(mockViagem.id!, novoStatus);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ status: novoStatus });
        });

        it('deve obter viagens recentes limitadas a 5', (done) => {
            service.obterViagensRecentes().subscribe(viagens => {
                expect(viagens.length).toBeLessThanOrEqual(5);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('atualizadoEm', 'desc');
                done();
            });
        });
    });

    describe('Integração com Serviços Relacionados - Estatísticas', () => {
        beforeEach(() => {
            // Configurar mocks dos serviços relacionados
            mockDiasViagemService.listarDiasViagem.and.returnValue(of([
                MockDataFactory.createDiaViagem(),
                MockDataFactory.createDiaViagem()
            ]));

            mockParadasService.listarParadasViagem.and.returnValue(of([
                MockDataFactory.createParada(),
                MockDataFactory.createParada(),
                MockDataFactory.createParada()
            ]));

            mockHospedagensService.listarHospedagensViagem.and.returnValue(of([
                MockDataFactory.createHospedagem()
            ]));

            mockCustosService.listarCustosViagem.and.returnValue(of([
                MockDataFactory.createCusto(),
                MockDataFactory.createCusto()
            ]));
        });

        it('deve obter estatísticas completas da viagem', async () => {
            const estatisticas = await service.obterEstatisticasViagem(mockViagem.id!);

            expect(estatisticas).toEqual({
                totalDias: 2,
                totalParadas: 3,
                totalHospedagens: 1,
                totalCustos: 2,
                valorTotalCustos: jasmine.any(Number),
                temDadosRelacionados: true
            });

            expect(mockDiasViagemService.listarDiasViagem).toHaveBeenCalledWith(mockViagem.id);
            expect(mockParadasService.listarParadasViagem).toHaveBeenCalledWith(mockViagem.id);
            expect(mockHospedagensService.listarHospedagensViagem).toHaveBeenCalledWith(mockViagem.id);
            expect(mockCustosService.listarCustosViagem).toHaveBeenCalledWith(mockViagem.id);
        });

        it('deve retornar estatísticas vazias em caso de erro', async () => {
            mockDiasViagemService.listarDiasViagem.and.returnValue(throwError(() => new Error('Erro de rede')));

            const estatisticas = await service.obterEstatisticasViagem(mockViagem.id!);

            expect(estatisticas).toEqual({
                totalDias: 0,
                totalParadas: 0,
                totalHospedagens: 0,
                totalCustos: 0,
                valorTotalCustos: 0,
                temDadosRelacionados: false
            });
        });
    });

    describe('Exclusão Completa com Rollback', () => {
        beforeEach(() => {
            // Mock para recuperar viagem por ID
            spyOn(service, 'recuperarPorId').and.returnValue(of(mockViagem));

            // Configurar dados relacionados para exclusão
            mockDiasViagemService.listarDiasViagem.and.returnValue(of([
                { ...MockDataFactory.createDiaViagem(), id: 'dia-1' },
                { ...MockDataFactory.createDiaViagem(), id: 'dia-2' }
            ]));

            mockParadasService.listarParadasViagem.and.returnValue(of([
                { ...MockDataFactory.createParada(), id: 'parada-1' }
            ]));

            mockHospedagensService.listarHospedagensViagem.and.returnValue(of([
                { ...MockDataFactory.createHospedagem(), id: 'hospedagem-1' }
            ]));

            mockCustosService.listarCustosViagem.and.returnValue(of([
                { ...MockDataFactory.createCusto(), id: 'custo-1' }
            ]));

            // Mock dos métodos de remoção
            mockDiasViagemService.remove.and.returnValue(Promise.resolve());
            mockParadasService.remove.and.returnValue(Promise.resolve());
            mockHospedagensService.remove.and.returnValue(Promise.resolve());
            mockCustosService.remove.and.returnValue(Promise.resolve());
        });

        it('deve excluir viagem e todos os dados relacionados com sucesso', async () => {
            await service.excluirViagemCompleta(mockViagem.id!);

            // Verificar se todos os dados relacionados foram excluídos
            expect(mockCustosService.remove).toHaveBeenCalledWith('custo-1');
            expect(mockHospedagensService.remove).toHaveBeenCalledWith('hospedagem-1');
            expect(mockParadasService.remove).toHaveBeenCalledWith('parada-1');
            expect(mockDiasViagemService.remove).toHaveBeenCalledWith('dia-1');
            expect(mockDiasViagemService.remove).toHaveBeenCalledWith('dia-2');

            // Verificar se a viagem foi excluída por último
            expect(mockFirestore.deleteDoc).toHaveBeenCalled();
        });

        it('deve verificar permissão antes de excluir', async () => {
            const viagemOutroUsuario = { ...mockViagem, usuarioId: 'outro-usuario' };
            spyOn(service, 'recuperarPorId').and.returnValue(of(viagemOutroUsuario));

            await expectAsync(service.excluirViagemCompleta(mockViagem.id!))
                .toBeRejectedWithError('Erro ao excluir viagem: Você não tem permissão para excluir esta viagem');
        });

        it('deve lançar erro se viagem não for encontrada', async () => {
            spyOn(service, 'recuperarPorId').and.returnValue(of(undefined));

            await expectAsync(service.excluirViagemCompleta('viagem-inexistente'))
                .toBeRejectedWithError('Erro ao excluir viagem: Viagem não encontrada');
        });

        it('deve realizar rollback em caso de erro durante exclusão', async () => {
            // Simular erro durante exclusão de custos
            mockCustosService.remove.and.returnValue(Promise.reject(new Error('Erro de rede')));

            // Mock dos métodos de criação para rollback
            spyOn(service, 'novo').and.returnValue(Promise.resolve('restored-viagem-id'));
            mockDiasViagemService.novo = jasmine.createSpy('novo').and.returnValue(Promise.resolve('restored-dia-id'));
            mockParadasService.novo = jasmine.createSpy('novo').and.returnValue(Promise.resolve('restored-parada-id'));
            mockHospedagensService.novo = jasmine.createSpy('novo').and.returnValue(Promise.resolve('restored-hospedagem-id'));
            mockCustosService.novo = jasmine.createSpy('novo').and.returnValue(Promise.resolve('restored-custo-id'));

            await expectAsync(service.excluirViagemCompleta(mockViagem.id!))
                .toBeRejectedWithError('Erro ao excluir viagem: Erro ao excluir custos: Erro de rede');

            // Verificar se rollback foi executado
            expect(service.novo).toHaveBeenCalled();
            expect(mockDiasViagemService.novo).toHaveBeenCalledTimes(2);
            expect(mockParadasService.novo).toHaveBeenCalledTimes(1);
            expect(mockHospedagensService.novo).toHaveBeenCalledTimes(1);
            expect(mockCustosService.novo).toHaveBeenCalledTimes(1);
        });

        it('deve tratar erro crítico se rollback falhar', async () => {
            // Simular erro durante exclusão
            mockCustosService.remove.and.returnValue(Promise.reject(new Error('Erro de exclusão')));

            // Simular erro durante rollback
            spyOn(service, 'novo').and.returnValue(Promise.reject(new Error('Erro de rollback')));

            await expectAsync(service.excluirViagemCompleta(mockViagem.id!))
                .toBeRejectedWithError(/Erro crítico durante exclusão/);
        });
    });

    describe('Tratamento de Erros Específicos', () => {
        it('deve tratar erro de permissão negada', async () => {
            const erroPermissao = { code: 'permission-denied', message: 'Permission denied' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroPermissao));

            await expectAsync(service.criarViagem({
                nome: 'Viagem Sem Permissão',
                descricao: 'Teste',
                dataInicio: '2024-06-01',
                dataFim: '2024-06-05'
            })).toBeRejectedWithError('Erro ao criar viagens');
        });

        it('deve tratar erro de rede', (done) => {
            const erroRede = { code: 'unavailable', message: 'Network error' };
            mockFirestore.getDocs.and.returnValue(Promise.reject(erroRede));

            service.listarViagensUsuario().subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar viagens');
                    done();
                }
            });
        });

        it('deve tratar erro de documento não encontrado', (done) => {
            const erroNotFound = { code: 'not-found', message: 'Document not found' };
            mockFirestore.getDoc.and.returnValue(Promise.reject(erroNotFound));

            service.recuperarPorId('viagem-inexistente').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao recuperar viagens');
                    done();
                }
            });
        });
    });

    describe('Cálculos e Validações', () => {
        it('deve calcular número de dias corretamente', async () => {
            const dadosViagem = {
                nome: 'Viagem Teste',
                descricao: 'Teste de cálculo',
                dataInicio: '2024-06-01',
                dataFim: '2024-06-05' // 5 dias
            };

            await service.criarViagem(dadosViagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroDias).toBe(5);
        });

        it('deve calcular número de dias para viagem de um dia', async () => {
            const dadosViagem = {
                nome: 'Viagem Um Dia',
                descricao: 'Teste',
                dataInicio: '2024-06-01',
                dataFim: '2024-06-01' // Mesmo dia
            };

            await service.criarViagem(dadosViagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroDias).toBe(1);
        });
    });

    describe('Operações em Lote', () => {
        it('deve processar exclusão de dados relacionados em lotes', async () => {
            // Simular muitos custos para testar processamento em lotes
            const muitosCustos = Array.from({ length: 25 }, (_, i) => ({
                ...MockDataFactory.createCusto(),
                id: `custo-${i}`
            }));

            mockCustosService.listarCustosViagem.and.returnValue(of(muitosCustos));
            mockCustosService.remove.and.returnValue(Promise.resolve());

            await service.excluirViagemCompleta(mockViagem.id!);

            // Verificar se todos os custos foram removidos
            expect(mockCustosService.remove).toHaveBeenCalledTimes(25);
        });
    });

    describe('Logs e Monitoramento', () => {
        beforeEach(() => {
            spyOn(console, 'log');
            spyOn(console, 'error');
            spyOn(console, 'warn');
        });

        it('deve registrar logs durante exclusão bem-sucedida', async () => {
            await service.excluirViagemCompleta(mockViagem.id!);

            expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching(/Iniciando exclusão da viagem/));
            expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching(/excluídos com sucesso/));
        });

        it('deve registrar logs de erro durante falha', async () => {
            mockCustosService.remove.and.returnValue(Promise.reject(new Error('Erro de teste')));
            spyOn(service, 'novo').and.returnValue(Promise.resolve('rollback-id'));

            await expectAsync(service.excluirViagemCompleta(mockViagem.id!))
                .toBeRejected();

            expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/Falha durante exclusão/), jasmine.any(Error));
            expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching(/Iniciando rollback/));
        });
    });
});