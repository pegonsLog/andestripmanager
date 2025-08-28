/**
 * Testes de Integração - CustosService
 * 
 * Testa a integração do CustosService com Firestore e AuthService,
 * incluindo operações CRUD, cálculos de relatórios e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { CustosService } from './custos.service';
import { AuthService } from '../core/services/auth.service';
import { Custo, CategoriaCusto, Usuario } from '../models';
import { MockDataFactory } from '../testing/test-utils';

describe('CustosService - Testes de Integração', () => {
    let service: CustosService;
    let mockFirestore: any;
    let mockAuthService: jasmine.SpyObj<AuthService>;

    const mockUsuario: Usuario = MockDataFactory.createUsuario();
    const mockCusto: Custo = MockDataFactory.createCusto();
    const mockCustos: Custo[] = [
        { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.COMBUSTIVEL, valor: 100, tipo: 'real' },
        { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.ALIMENTACAO, valor: 50, tipo: 'real' },
        { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.HOSPEDAGEM, valor: 200, tipo: 'real' },
        { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.COMBUSTIVEL, valor: 80, tipo: 'planejado' },
        { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.ALIMENTACAO, valor: 60, tipo: 'planejado' }
    ];

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-custo-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockCusto.id,
                data: () => mockCusto
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: mockCustos.map(c => ({
                    id: c.id,
                    data: () => c
                }))
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({})
        };

        // Mock do AuthService
        const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

        TestBed.configureTestingModule({
            providers: [
                CustosService,
                { provide: Firestore, useValue: mockFirestore },
                { provide: AuthService, useValue: authSpy }
            ]
        });

        service = TestBed.inject(CustosService);
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

        // Configurar usuário autenticado por padrão
        mockAuthService.getCurrentUser.and.returnValue(mockUsuario);
    });

    describe('Integração com Firestore - Consultas', () => {
        it('deve listar custos de uma viagem ordenados por data', (done) => {
            const viagemId = 'viagem-123';

            service.listarCustosViagem(viagemId).subscribe(custos => {
                expect(custos).toEqual(mockCustos);
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('data', 'desc');
                done();
            });
        });

        it('deve listar custos por categoria', (done) => {
            const viagemId = 'viagem-123';
            const categoria = CategoriaCusto.COMBUSTIVEL;

            service.listarPorCategoria(viagemId, categoria).subscribe(custos => {
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.where).toHaveBeenCalledWith('categoria', '==', categoria);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('data', 'desc');
                done();
            });
        });

        it('deve listar custos por tipo (planejado/real)', (done) => {
            const viagemId = 'viagem-123';
            const tipo = 'real';

            service.listarPorTipo(viagemId, tipo).subscribe(custos => {
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.where).toHaveBeenCalledWith('tipo', '==', tipo);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('data', 'desc');
                done();
            });
        });

        it('deve tratar erro durante listagem de custos', (done) => {
            const erro = new Error('Firestore error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            service.listarCustosViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar custos');
                    done();
                }
            });
        });
    });

    describe('Integração com AuthService - Criação', () => {
        it('deve criar custo com usuarioId do usuário autenticado', async () => {
            const dadosCusto = {
                viagemId: 'viagem-123',
                categoria: CategoriaCusto.COMBUSTIVEL,
                descricao: 'Abastecimento',
                valor: 150,
                data: '2024-06-01',
                tipo: 'real' as const
            };

            const custoId = await service.criarCusto(dadosCusto);

            expect(custoId).toBe('new-custo-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.usuarioId).toBe(mockUsuario.id);
            expect(dadosPassados.viagemId).toBe(dadosCusto.viagemId);
            expect(dadosPassados.categoria).toBe(dadosCusto.categoria);
            expect(dadosPassados.valor).toBe(dadosCusto.valor);
        });

        it('deve lançar erro se usuário não estiver autenticado', async () => {
            mockAuthService.getCurrentUser.and.returnValue(null);

            const dadosCusto = {
                viagemId: 'viagem-123',
                categoria: CategoriaCusto.COMBUSTIVEL,
                descricao: 'Teste',
                valor: 100,
                data: '2024-06-01',
                tipo: 'real' as const
            };

            await expectAsync(service.criarCusto(dadosCusto))
                .toBeRejectedWithError('Usuário não autenticado');
        });

        it('deve tratar erro durante criação de custo', async () => {
            const erro = new Error('Firestore create error');
            mockFirestore.addDoc.and.returnValue(Promise.reject(erro));

            const dadosCusto = {
                viagemId: 'viagem-123',
                categoria: CategoriaCusto.COMBUSTIVEL,
                descricao: 'Erro',
                valor: 100,
                data: '2024-06-01',
                tipo: 'real' as const
            };

            await expectAsync(service.criarCusto(dadosCusto))
                .toBeRejectedWithError('Erro ao criar custos');
        });
    });

    describe('Operações CRUD', () => {
        it('deve atualizar custo existente', async () => {
            const dadosAtualizacao = {
                valor: 175,
                descricao: 'Abastecimento atualizado'
            };

            await service.atualizar(mockCusto.id!, dadosAtualizacao);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual(jasmine.objectContaining(dadosAtualizacao));
        });

        it('deve tratar erro durante atualização', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.atualizar(mockCusto.id!, { valor: 200 }))
                .toBeRejectedWithError('Erro ao atualizar custos');
        });
    });

    describe('Cálculos e Relatórios', () => {
        beforeEach(() => {
            // Configurar mock para retornar custos específicos para cálculos
            spyOn(service, 'listarCustosViagem').and.returnValue(of(mockCustos));
        });

        it('deve calcular total por categoria corretamente', (done) => {
            service.calcularTotalPorCategoria('viagem-123').subscribe(resumo => {
                expect(resumo.length).toBeGreaterThan(0);

                // Verificar se combustível tem o maior valor
                const combustivel = resumo.find(r => r.categoria === CategoriaCusto.COMBUSTIVEL);
                expect(combustivel).toBeDefined();
                expect(combustivel!.valorTotal).toBe(100); // Apenas custos reais
                expect(combustivel!.quantidade).toBe(1);

                // Verificar se percentuais somam 100%
                const totalPercentual = resumo.reduce((sum, r) => sum + r.percentual, 0);
                expect(totalPercentual).toBeCloseTo(100, 1);

                done();
            });
        });

        it('deve calcular valor médio por categoria', (done) => {
            service.calcularTotalPorCategoria('viagem-123').subscribe(resumo => {
                const alimentacao = resumo.find(r => r.categoria === CategoriaCusto.ALIMENTACAO);
                expect(alimentacao).toBeDefined();
                expect(alimentacao!.valorMedio).toBe(50); // 50 / 1 = 50
                done();
            });
        });

        it('deve ordenar resumo por valor total decrescente', (done) => {
            service.calcularTotalPorCategoria('viagem-123').subscribe(resumo => {
                for (let i = 1; i < resumo.length; i++) {
                    expect(resumo[i - 1].valorTotal).toBeGreaterThanOrEqual(resumo[i].valorTotal);
                }
                done();
            });
        });

        it('deve gerar relatório completo de custos', (done) => {
            service.gerarRelatorio('viagem-123').subscribe(relatorio => {
                expect(relatorio.viagemId).toBe('viagem-123');
                expect(relatorio.totalReal).toBe(350); // 100 + 50 + 200
                expect(relatorio.totalPlanejado).toBe(140); // 80 + 60
                expect(relatorio.diferenca).toBe(210); // 350 - 140
                expect(relatorio.percentualVariacao).toBeCloseTo(150, 1); // (210/140) * 100

                expect(relatorio.resumoPorCategoria).toBeDefined();
                expect(relatorio.resumoPorCategoria.length).toBeGreaterThan(0);

                expect(relatorio.dataGeracao).toBeDefined();
                expect(new Date(relatorio.dataGeracao)).toBeInstanceOf(Date);

                done();
            });
        });

        it('deve calcular custo médio por dia no relatório', (done) => {
            // Configurar custos com datas diferentes
            const custosComDatas = mockCustos.map((c, index) => ({
                ...c,
                data: `2024-06-0${(index % 3) + 1}`, // 3 dias diferentes
                tipo: 'real' as const
            }));

            spyOn(service, 'listarCustosViagem').and.returnValue(of(custosComDatas));

            service.gerarRelatorio('viagem-123').subscribe(relatorio => {
                const totalReal = custosComDatas.reduce((sum, c) => sum + c.valor, 0);
                const diasUnicos = 3; // 3 dias diferentes
                const custoMedioEsperado = totalReal / diasUnicos;

                expect(relatorio.custoMedioPorDia).toBeCloseTo(custoMedioEsperado, 2);
                done();
            });
        });

        it('deve tratar caso sem custos no relatório', (done) => {
            spyOn(service, 'listarCustosViagem').and.returnValue(of([]));

            service.gerarRelatorio('viagem-123').subscribe(relatorio => {
                expect(relatorio.totalReal).toBe(0);
                expect(relatorio.totalPlanejado).toBe(0);
                expect(relatorio.diferenca).toBe(0);
                expect(relatorio.percentualVariacao).toBe(0);
                expect(relatorio.custoMedioPorDia).toBe(0);
                expect(relatorio.resumoPorCategoria).toEqual([]);
                done();
            });
        });
    });

    describe('Tratamento de Erros Específicos do Firestore', () => {
        it('deve tratar erro de permissão negada', async () => {
            const erroPermissao = { code: 'permission-denied', message: 'Permission denied' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroPermissao));

            await expectAsync(service.criarCusto({
                viagemId: 'viagem-123',
                categoria: CategoriaCusto.COMBUSTIVEL,
                descricao: 'Sem permissão',
                valor: 100,
                data: '2024-06-01',
                tipo: 'real'
            })).toBeRejectedWithError('Erro ao criar custos');
        });

        it('deve tratar erro de rede', (done) => {
            const erroRede = { code: 'unavailable', message: 'Network error' };
            mockFirestore.getDocs.and.returnValue(Promise.reject(erroRede));

            service.listarCustosViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar custos');
                    done();
                }
            });
        });

        it('deve tratar erro de documento não encontrado', async () => {
            const erroNotFound = { code: 'not-found', message: 'Document not found' };
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erroNotFound));

            await expectAsync(service.atualizar('custo-inexistente', { valor: 100 }))
                .toBeRejectedWithError('Erro ao atualizar custos');
        });
    });

    describe('Validação de Dados', () => {
        it('deve preservar todos os campos ao criar custo', async () => {
            const dadosCompletos = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-456',
                categoria: CategoriaCusto.MANUTENCAO,
                descricao: 'Troca de óleo',
                valor: 80,
                data: '2024-06-01',
                observacoes: 'Manutenção preventiva',
                comprovante: 'url-do-comprovante',
                tipo: 'real' as const
            };

            await service.criarCusto(dadosCompletos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(dadosCompletos.viagemId);
            expect(dadosPassados.diaViagemId).toBe(dadosCompletos.diaViagemId);
            expect(dadosPassados.categoria).toBe(dadosCompletos.categoria);
            expect(dadosPassados.descricao).toBe(dadosCompletos.descricao);
            expect(dadosPassados.valor).toBe(dadosCompletos.valor);
            expect(dadosPassados.data).toBe(dadosCompletos.data);
            expect(dadosPassados.observacoes).toBe(dadosCompletos.observacoes);
            expect(dadosPassados.comprovante).toBe(dadosCompletos.comprovante);
            expect(dadosPassados.tipo).toBe(dadosCompletos.tipo);
            expect(dadosPassados.usuarioId).toBe(mockUsuario.id);
        });

        it('deve funcionar com campos opcionais ausentes', async () => {
            const dadosMinimos = {
                viagemId: 'viagem-123',
                categoria: CategoriaCusto.OUTROS,
                descricao: 'Gasto diversos',
                valor: 25,
                data: '2024-06-01',
                tipo: 'real' as const
            };

            await service.criarCusto(dadosMinimos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(dadosMinimos.viagemId);
            expect(dadosPassados.categoria).toBe(dadosMinimos.categoria);
            expect(dadosPassados.valor).toBe(dadosMinimos.valor);
            expect(dadosPassados.usuarioId).toBe(mockUsuario.id);
            expect(dadosPassados.diaViagemId).toBeUndefined();
            expect(dadosPassados.observacoes).toBeUndefined();
            expect(dadosPassados.comprovante).toBeUndefined();
        });
    });

    describe('Performance e Otimização', () => {
        it('deve lidar com grande volume de custos', (done) => {
            const muitosCustos = Array.from({ length: 1000 }, (_, i) => ({
                ...MockDataFactory.createCusto(),
                id: `custo-${i}`,
                valor: Math.random() * 100,
                categoria: Object.values(CategoriaCusto)[i % Object.values(CategoriaCusto).length]
            }));

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: muitosCustos.map(c => ({
                    id: c.id,
                    data: () => c
                }))
            }));

            service.calcularTotalPorCategoria('viagem-123').subscribe(resumo => {
                expect(resumo.length).toBe(Object.values(CategoriaCusto).length);

                // Verificar se todos os custos foram processados
                const totalCustos = resumo.reduce((sum, r) => sum + r.quantidade, 0);
                expect(totalCustos).toBe(1000);

                done();
            });
        });

        it('deve calcular percentuais corretamente com valores decimais', (done) => {
            const custosDecimais = [
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.COMBUSTIVEL, valor: 33.33, tipo: 'real' },
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.ALIMENTACAO, valor: 33.33, tipo: 'real' },
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.HOSPEDAGEM, valor: 33.34, tipo: 'real' }
            ];

            spyOn(service, 'listarCustosViagem').and.returnValue(of(custosDecimais));

            service.calcularTotalPorCategoria('viagem-123').subscribe(resumo => {
                const totalPercentual = resumo.reduce((sum, r) => sum + r.percentual, 0);
                expect(totalPercentual).toBeCloseTo(100, 1);
                done();
            });
        });
    });

    describe('Casos Extremos', () => {
        it('deve tratar custos com valor zero', (done) => {
            const custosComZero = [
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.COMBUSTIVEL, valor: 0, tipo: 'real' },
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.ALIMENTACAO, valor: 100, tipo: 'real' }
            ];

            spyOn(service, 'listarCustosViagem').and.returnValue(of(custosComZero));

            service.calcularTotalPorCategoria('viagem-123').subscribe(resumo => {
                const combustivel = resumo.find(r => r.categoria === CategoriaCusto.COMBUSTIVEL);
                expect(combustivel!.valorTotal).toBe(0);
                expect(combustivel!.percentual).toBe(0);
                done();
            });
        });

        it('deve tratar custos com valores negativos', (done) => {
            const custosComNegativo = [
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.COMBUSTIVEL, valor: -50, tipo: 'real' },
                { ...MockDataFactory.createCusto(), categoria: CategoriaCusto.ALIMENTACAO, valor: 150, tipo: 'real' }
            ];

            spyOn(service, 'listarCustosViagem').and.returnValue(of(custosComNegativo));

            service.gerarRelatorio('viagem-123').subscribe(relatorio => {
                expect(relatorio.totalReal).toBe(100); // -50 + 150
                expect(relatorio.resumoPorCategoria.length).toBe(2);
                done();
            });
        });
    });
});