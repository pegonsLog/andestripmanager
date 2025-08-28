/**
 * Testes de Integração - ManutencoesService
 * 
 * Testa a integração do ManutencoesService com Firestore e BaseService,
 * incluindo operações CRUD, consultas específicas e cálculos estatísticos.
 */

import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { of, throwError } from 'rxjs';

import { ManutencoesService } from './manutencoes.service';
import { 
    Manutencao, 
    ItemManutencao, 
    CategoriaManutencao 
} from '../models/manutencao.interface';
import { TipoManutencao } from '../models/enums';
import { MockDataFactory } from '../testing/test-utils';

describe('ManutencoesService - Testes de Integração', () => {
    let service: ManutencoesService;
    let mockFirestore: any;

    const mockManutencao: Manutencao = MockDataFactory.createManutencao();
    const mockManutencoes: Manutencao[] = [
        { ...MockDataFactory.createManutencao(), id: 'manutencao-1', tipo: TipoManutencao.PRE_VIAGEM, custo: 150 },
        { ...MockDataFactory.createManutencao(), id: 'manutencao-2', tipo: TipoManutencao.DURANTE_VIAGEM, custo: 80 },
        { ...MockDataFactory.createManutencao(), id: 'manutencao-3', tipo: TipoManutencao.PRE_VIAGEM, custo: 200 }
    ];

    beforeEach(() => {
        // Mock do AngularFirestore
        const mockCollection = {
            valueChanges: jasmine.createSpy('valueChanges').and.returnValue(of(mockManutencoes)),
            add: jasmine.createSpy('add').and.returnValue(Promise.resolve({ id: 'new-manutencao-id' })),
            doc: jasmine.createSpy('doc').and.returnValue({
                update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
                delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
                get: jasmine.createSpy('get').and.returnValue(Promise.resolve({
                    exists: true,
                    id: mockManutencao.id,
                    data: () => mockManutencao
                }))
            })
        };

        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue(mockCollection)
        };

        TestBed.configureTestingModule({
            providers: [
                ManutencoesService,
                { provide: AngularFirestore, useValue: mockFirestore }
            ]
        });

        service = TestBed.inject(ManutencoesService);
    });

    describe('Integração com BaseService - Operações CRUD', () => {
        it('deve herdar funcionalidades do BaseService', () => {
            expect(service.novo).toBeDefined();
            expect(service.altera).toBeDefined();
            expect(service.remove).toBeDefined();
            expect(service.lista).toBeDefined();
            expect(service.recuperarPorId).toBeDefined();
        });

        it('deve usar collection name correto', () => {
            service.lista().subscribe();
            expect(mockFirestore.collection).toHaveBeenCalledWith('manutencoes');
        });

        it('deve criar nova manutenção com dados completos', async () => {
            const novaManutencao: Omit<Manutencao, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                usuarioId: 'user-123',
                viagemId: 'viagem-123',
                tipo: TipoManutencao.PRE_VIAGEM,
                data: '2024-06-01',
                descricao: 'Manutenção preventiva completa',
                itens: [
                    {
                        nome: 'Troca de óleo',
                        categoria: CategoriaManutencao.MOTOR,
                        custo: 80,
                        observacoes: 'Óleo sintético'
                    }
                ],
                custo: 150,
                local: 'Oficina Central'
            };

            await service.novo(novaManutencao);

            const collection = mockFirestore.collection.calls.mostRecent().returnValue;
            expect(collection.add).toHaveBeenCalledWith(jasmine.objectContaining({
                usuarioId: 'user-123',
                viagemId: 'viagem-123',
                tipo: TipoManutencao.PRE_VIAGEM,
                descricao: 'Manutenção preventiva completa',
                custo: 150
            }));
        });
    });

    describe('Consultas Específicas por Usuário', () => {
        it('deve recuperar manutenções por usuário ordenadas por data', (done) => {
            const usuarioId = 'user-123';

            service.recuperarPorUsuario(usuarioId).subscribe(manutencoes => {
                expect(manutencoes).toEqual(mockManutencoes);
                
                expect(mockFirestore.collection).toHaveBeenCalledWith('manutencoes', jasmine.any(Function));
                
                // Verificar se a função de query foi configurada corretamente
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                expect(mockRef.where).toHaveBeenCalledWith('usuarioId', '==', usuarioId);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                
                done();
            });
        });

        it('deve recuperar manutenções por viagem', (done) => {
            const viagemId = 'viagem-123';

            service.recuperarPorViagem(viagemId).subscribe(manutencoes => {
                expect(manutencoes).toEqual(mockManutencoes);
                
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                expect(mockRef.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                
                done();
            });
        });

        it('deve ter alias listarManutencoesPorViagem para compatibilidade com exportação', (done) => {
            const viagemId = 'viagem-123';

            service.listarManutencoesPorViagem(viagemId).subscribe(manutencoes => {
                expect(manutencoes).toEqual(mockManutencoes);
                done();
            });
        });

        it('deve recuperar manutenções por tipo', (done) => {
            const usuarioId = 'user-123';
            const tipo = TipoManutencao.PRE_VIAGEM;

            service.recuperarPorTipo(usuarioId, tipo).subscribe(manutencoes => {
                expect(manutencoes).toEqual(mockManutencoes);
                
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                expect(mockRef.where).toHaveBeenCalledWith('usuarioId', '==', usuarioId);
                expect(mockRef.where).toHaveBeenCalledWith('tipo', '==', tipo);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                
                done();
            });
        });

        it('deve recuperar manutenções por período', (done) => {
            const usuarioId = 'user-123';
            const dataInicio = '2024-01-01';
            const dataFim = '2024-12-31';

            service.recuperarPorPeriodo(usuarioId, dataInicio, dataFim).subscribe(manutencoes => {
                expect(manutencoes).toEqual(mockManutencoes);
                
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                expect(mockRef.where).toHaveBeenCalledWith('usuarioId', '==', usuarioId);
                expect(mockRef.where).toHaveBeenCalledWith('data', '>=', dataInicio);
                expect(mockRef.where).toHaveBeenCalledWith('data', '<=', dataFim);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                
                done();
            });
        });
    });

    describe('Cálculos e Estatísticas', () => {
        it('deve calcular custo total por período', (done) => {
            const usuarioId = 'user-123';
            const dataInicio = '2024-01-01';
            const dataFim = '2024-12-31';

            // Mock das manutenções com custos específicos
            const manutencoesComCusto = [
                { ...mockManutencao, custo: 150 },
                { ...mockManutencao, custo: 80 },
                { ...mockManutencao, custo: 200 }
            ];

            spyOn(service, 'recuperarPorPeriodo').and.returnValue(of(manutencoesComCusto));

            service.calcularCustoTotalPorPeriodo(usuarioId, dataInicio, dataFim).subscribe(custoTotal => {
                expect(custoTotal).toBe(430); // 150 + 80 + 200
                expect(service.recuperarPorPeriodo).toHaveBeenCalledWith(usuarioId, dataInicio, dataFim);
                done();
            });
        });

        it('deve calcular custo total zero para período sem manutenções', (done) => {
            const usuarioId = 'user-123';
            const dataInicio = '2024-01-01';
            const dataFim = '2024-12-31';

            spyOn(service, 'recuperarPorPeriodo').and.returnValue(of([]));

            service.calcularCustoTotalPorPeriodo(usuarioId, dataInicio, dataFim).subscribe(custoTotal => {
                expect(custoTotal).toBe(0);
                done();
            });
        });

        it('deve recuperar estatísticas completas do usuário', (done) => {
            const usuarioId = 'user-123';

            // Mock das manutenções com dados específicos para estatísticas
            const manutencoesEstatisticas = [
                { 
                    ...mockManutencao, 
                    id: 'manutencao-1', 
                    tipo: TipoManutencao.PRE_VIAGEM, 
                    custo: 150,
                    data: '2024-06-01'
                },
                { 
                    ...mockManutencao, 
                    id: 'manutencao-2', 
                    tipo: TipoManutencao.DURANTE_VIAGEM, 
                    custo: 80,
                    data: '2024-05-15'
                },
                { 
                    ...mockManutencao, 
                    id: 'manutencao-3', 
                    tipo: TipoManutencao.PRE_VIAGEM, 
                    custo: 200,
                    data: '2024-04-10'
                }
            ];

            spyOn(service, 'recuperarPorUsuario').and.returnValue(of(manutencoesEstatisticas));

            service.recuperarEstatisticas(usuarioId).subscribe(estatisticas => {
                expect(estatisticas.totalManutencoes).toBe(3);
                expect(estatisticas.custoTotal).toBe(430); // 150 + 80 + 200
                expect(estatisticas.custoMedio).toBe(143.33333333333334); // 430 / 3
                expect(estatisticas.manutencoesPorTipo[TipoManutencao.PRE_VIAGEM]).toBe(2);
                expect(estatisticas.manutencoesPorTipo[TipoManutencao.DURANTE_VIAGEM]).toBe(1);
                expect(estatisticas.ultimaManutencao).toEqual(manutencoesEstatisticas[0]); // Primeira da lista ordenada
                
                done();
            });
        });

        it('deve retornar estatísticas vazias para usuário sem manutenções', (done) => {
            const usuarioId = 'user-sem-manutencoes';

            spyOn(service, 'recuperarPorUsuario').and.returnValue(of([]));

            service.recuperarEstatisticas(usuarioId).subscribe(estatisticas => {
                expect(estatisticas.totalManutencoes).toBe(0);
                expect(estatisticas.custoTotal).toBe(0);
                expect(estatisticas.custoMedio).toBe(0);
                expect(estatisticas.manutencoesPorTipo).toEqual({});
                expect(estatisticas.ultimaManutencao).toBeUndefined();
                
                done();
            });
        });
    });

    describe('Checklists de Manutenção', () => {
        it('deve criar checklist de manutenção preventiva', () => {
            const checklist = service.criarChecklistPreventiva();

            expect(checklist.length).toBeGreaterThan(0);
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Troca de óleo do motor',
                categoria: CategoriaManutencao.MOTOR
            }));
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Verificação dos freios',
                categoria: CategoriaManutencao.FREIOS
            }));
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Calibragem dos pneus',
                categoria: CategoriaManutencao.PNEUS
            }));
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Verificação da corrente',
                categoria: CategoriaManutencao.TRANSMISSAO
            }));
        });

        it('deve criar checklist para manutenção durante viagem', () => {
            const checklist = service.criarChecklistViagem();

            expect(checklist.length).toBeGreaterThan(0);
            expect(checklist.length).toBeLessThan(service.criarChecklistPreventiva().length);
            
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Verificação dos pneus',
                categoria: CategoriaManutencao.PNEUS
            }));
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Verificação dos freios',
                categoria: CategoriaManutencao.FREIOS
            }));
            expect(checklist).toContain(jasmine.objectContaining({
                nome: 'Verificação do óleo',
                categoria: CategoriaManutencao.MOTOR
            }));
        });

        it('deve inicializar itens do checklist com custo zero', () => {
            const checklistPreventiva = service.criarChecklistPreventiva();
            const checklistViagem = service.criarChecklistViagem();

            checklistPreventiva.forEach(item => {
                expect(item.custo).toBe(0);
            });

            checklistViagem.forEach(item => {
                expect(item.custo).toBe(0);
            });
        });

        it('deve incluir todas as categorias principais no checklist preventivo', () => {
            const checklist = service.criarChecklistPreventiva();
            const categorias = checklist.map(item => item.categoria);

            expect(categorias).toContain(CategoriaManutencao.MOTOR);
            expect(categorias).toContain(CategoriaManutencao.FREIOS);
            expect(categorias).toContain(CategoriaManutencao.PNEUS);
            expect(categorias).toContain(CategoriaManutencao.TRANSMISSAO);
            expect(categorias).toContain(CategoriaManutencao.ELETRICA);
            expect(categorias).toContain(CategoriaManutencao.SUSPENSAO);
        });

        it('deve focar em itens essenciais no checklist de viagem', () => {
            const checklist = service.criarChecklistViagem();
            const nomes = checklist.map(item => item.nome);

            // Itens essenciais para segurança durante viagem
            expect(nomes).toContain('Verificação dos pneus');
            expect(nomes).toContain('Verificação dos freios');
            expect(nomes).toContain('Verificação da corrente');
            expect(nomes).toContain('Verificação das luzes');
            expect(nomes).toContain('Verificação do óleo');
        });
    });

    describe('Tratamento de Erros', () => {
        it('deve tratar erro ao recuperar manutenções por usuário', (done) => {
            const erro = new Error('Firestore query error');
            const mockCollection = {
                valueChanges: jasmine.createSpy('valueChanges').and.returnValue(throwError(() => erro))
            };
            mockFirestore.collection.and.returnValue(mockCollection);

            service.recuperarPorUsuario('user-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err).toBe(erro);
                    done();
                }
            });
        });

        it('deve tratar erro ao calcular custo total', (done) => {
            const erro = new Error('Calculation error');
            spyOn(service, 'recuperarPorPeriodo').and.returnValue(throwError(() => erro));

            service.calcularCustoTotalPorPeriodo('user-123', '2024-01-01', '2024-12-31').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err).toBe(erro);
                    done();
                }
            });
        });

        it('deve tratar erro ao recuperar estatísticas', (done) => {
            const erro = new Error('Statistics error');
            spyOn(service, 'recuperarPorUsuario').and.returnValue(throwError(() => erro));

            service.recuperarEstatisticas('user-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err).toBe(erro);
                    done();
                }
            });
        });
    });

    describe('Cenários Complexos e Edge Cases', () => {
        it('deve lidar com manutenções sem custo definido', (done) => {
            const manutencoesComCustoUndefined = [
                { ...mockManutencao, custo: 100 },
                { ...mockManutencao, custo: undefined as any },
                { ...mockManutencao, custo: 50 }
            ];

            spyOn(service, 'recuperarPorPeriodo').and.returnValue(of(manutencoesComCustoUndefined));

            service.calcularCustoTotalPorPeriodo('user-123', '2024-01-01', '2024-12-31').subscribe(custoTotal => {
                expect(custoTotal).toBe(150); // 100 + 0 + 50 (undefined tratado como 0)
                done();
            });
        });

        it('deve agrupar corretamente manutenções por tipo nas estatísticas', (done) => {
            const manutencoesVariadas = [
                { ...mockManutencao, tipo: TipoManutencao.PRE_VIAGEM },
                { ...mockManutencao, tipo: TipoManutencao.PRE_VIAGEM },
                { ...mockManutencao, tipo: TipoManutencao.DURANTE_VIAGEM },
                { ...mockManutencao, tipo: TipoManutencao.PRE_VIAGEM },
                { ...mockManutencao, tipo: TipoManutencao.DURANTE_VIAGEM }
            ];

            spyOn(service, 'recuperarPorUsuario').and.returnValue(of(manutencoesVariadas));

            service.recuperarEstatisticas('user-123').subscribe(estatisticas => {
                expect(estatisticas.manutencoesPorTipo[TipoManutencao.PRE_VIAGEM]).toBe(3);
                expect(estatisticas.manutencoesPorTipo[TipoManutencao.DURANTE_VIAGEM]).toBe(2);
                done();
            });
        });

        it('deve lidar com consultas por período com datas iguais', (done) => {
            const usuarioId = 'user-123';
            const data = '2024-06-01';

            service.recuperarPorPeriodo(usuarioId, data, data).subscribe(manutencoes => {
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                expect(mockRef.where).toHaveBeenCalledWith('data', '>=', data);
                expect(mockRef.where).toHaveBeenCalledWith('data', '<=', data);
                done();
            });
        });

        it('deve preservar ordem cronológica nas consultas', (done) => {
            const manutencoesOrdenadas = [
                { ...mockManutencao, id: '1', data: '2024-06-03' },
                { ...mockManutencao, id: '2', data: '2024-06-02' },
                { ...mockManutencao, id: '3', data: '2024-06-01' }
            ];

            const mockCollection = {
                valueChanges: jasmine.createSpy('valueChanges').and.returnValue(of(manutencoesOrdenadas))
            };
            mockFirestore.collection.and.returnValue(mockCollection);

            service.recuperarPorUsuario('user-123').subscribe(manutencoes => {
                expect(manutencoes).toEqual(manutencoesOrdenadas);
                
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                done();
            });
        });
    });

    describe('Integração com Firestore - Queries Complexas', () => {
        it('deve construir query correta para múltiplos filtros', (done) => {
            const usuarioId = 'user-123';
            const tipo = TipoManutencao.PRE_VIAGEM;

            service.recuperarPorTipo(usuarioId, tipo).subscribe(() => {
                expect(mockFirestore.collection).toHaveBeenCalledWith('manutencoes', jasmine.any(Function));
                
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                expect(mockRef.where).toHaveBeenCalledTimes(2);
                expect(mockRef.where).toHaveBeenCalledWith('usuarioId', '==', usuarioId);
                expect(mockRef.where).toHaveBeenCalledWith('tipo', '==', tipo);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                
                done();
            });
        });

        it('deve usar índices compostos para queries de período', (done) => {
            const usuarioId = 'user-123';
            const dataInicio = '2024-01-01';
            const dataFim = '2024-12-31';

            service.recuperarPorPeriodo(usuarioId, dataInicio, dataFim).subscribe(() => {
                const queryFn = mockFirestore.collection.calls.mostRecent().args[1];
                const mockRef = {
                    where: jasmine.createSpy('where').and.returnThis(),
                    orderBy: jasmine.createSpy('orderBy').and.returnThis()
                };
                
                queryFn(mockRef);
                
                // Verificar ordem das cláusulas where para otimização de índices
                expect(mockRef.where).toHaveBeenCalledWith('usuarioId', '==', usuarioId);
                expect(mockRef.where).toHaveBeenCalledWith('data', '>=', dataInicio);
                expect(mockRef.where).toHaveBeenCalledWith('data', '<=', dataFim);
                expect(mockRef.orderBy).toHaveBeenCalledWith('data', 'desc');
                
                done();
            });
        });
    });
});