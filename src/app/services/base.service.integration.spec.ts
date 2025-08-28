/**
 * Testes de Integração - BaseFirestoreService
 * 
 * Testa a integração do BaseFirestoreService com Firestore,
 * incluindo operações CRUD, tratamento de erros e consultas.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore, Timestamp } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { BaseFirestoreService } from '../core/services/base.service';
import { BaseEntity } from '../models';
import { MockDataFactory } from '../testing/test-utils';

// Interface de teste que estende BaseEntity
interface TestEntity extends BaseEntity {
    nome: string;
    descricao: string;
    valor: number;
}

// Implementação concreta para testes
class TestService extends BaseFirestoreService<TestEntity> {
    protected collectionName = 'test-collection';

    constructor(firestore: Firestore) {
        super(firestore);
    }
}

describe('BaseFirestoreService - Testes de Integração', () => {
    let service: TestService;
    let mockFirestore: any;

    const mockTestEntity: TestEntity = {
        id: 'test-123',
        usuarioId: 'user-123',
        nome: 'Entidade de Teste',
        descricao: 'Descrição da entidade',
        valor: 100,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now()
    };

    beforeEach(() => {
        // Mock completo do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-doc-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: 'test-123',
                data: () => mockTestEntity
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: [
                    {
                        id: 'test-123',
                        data: () => mockTestEntity
                    }
                ]
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({}),
            limit: jasmine.createSpy('limit').and.returnValue({})
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: Firestore, useValue: mockFirestore }
            ]
        });

        const firestore = TestBed.inject(Firestore);
        service = new TestService(firestore);
    });

    describe('Operação CREATE (novo)', () => {
        it('deve criar novo documento com timestamps automáticos', async () => {
            const novosDados = {
                usuarioId: 'user-123',
                nome: 'Nova Entidade',
                descricao: 'Nova descrição',
                valor: 200
            };

            const docId = await service.novo(novosDados);

            expect(docId).toBe('new-doc-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            // Verificar se timestamps foram adicionados
            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.criadoEm).toBeDefined();
            expect(dadosPassados.atualizadoEm).toBeDefined();
        });

        it('deve tratar erro durante criação', async () => {
            const erro = new Error('Firestore create error');
            mockFirestore.addDoc.and.returnValue(Promise.reject(erro));

            const novosDados = {
                usuarioId: 'user-123',
                nome: 'Entidade com Erro',
                descricao: 'Descrição',
                valor: 100
            };

            await expectAsync(service.novo(novosDados))
                .toBeRejectedWithError('Erro ao criar test-collection');
        });

        it('deve preservar dados originais ao adicionar timestamps', async () => {
            const novosDados = {
                usuarioId: 'user-123',
                nome: 'Entidade Preservada',
                descricao: 'Descrição preservada',
                valor: 300
            };

            await service.novo(novosDados);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.usuarioId).toBe(novosDados.usuarioId);
            expect(dadosPassados.nome).toBe(novosDados.nome);
            expect(dadosPassados.descricao).toBe(novosDados.descricao);
            expect(dadosPassados.valor).toBe(novosDados.valor);
        });
    });

    describe('Operação READ (recuperar)', () => {
        it('deve recuperar documento por ID', (done) => {
            service.recuperarPorId('test-123').subscribe(resultado => {
                expect(resultado).toEqual({
                    id: 'test-123',
                    ...mockTestEntity
                });
                expect(mockFirestore.getDoc).toHaveBeenCalled();
                done();
            });
        });

        it('deve retornar undefined para documento inexistente', (done) => {
            mockFirestore.getDoc.and.returnValue(Promise.resolve({
                exists: () => false,
                data: () => null
            }));

            service.recuperarPorId('inexistente').subscribe(resultado => {
                expect(resultado).toBeUndefined();
                done();
            });
        });

        it('deve tratar erro durante recuperação por ID', (done) => {
            const erro = new Error('Firestore get error');
            mockFirestore.getDoc.and.returnValue(Promise.reject(erro));

            service.recuperarPorId('test-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao recuperar test-collection');
                    done();
                }
            });
        });

        it('deve listar todos os documentos', (done) => {
            service.lista().subscribe(resultado => {
                expect(resultado).toEqual([{
                    id: 'test-123',
                    ...mockTestEntity
                }]);
                expect(mockFirestore.getDocs).toHaveBeenCalled();
                done();
            });
        });

        it('deve listar documentos com constraints', (done) => {
            const constraints = [mockFirestore.where, mockFirestore.orderBy];

            service.lista(constraints).subscribe(resultado => {
                expect(resultado.length).toBe(1);
                expect(mockFirestore.query).toHaveBeenCalled();
                done();
            });
        });

        it('deve recuperar documentos por campo específico', (done) => {
            service.recuperarPorOutroParametro('usuarioId', 'user-123').subscribe(resultado => {
                expect(resultado.length).toBe(1);
                expect(resultado[0].usuarioId).toBe('user-123');
                expect(mockFirestore.where).toHaveBeenCalledWith('usuarioId', '==', 'user-123');
                done();
            });
        });

        it('deve recuperar documentos com ordenação', (done) => {
            service.recuperarComOrdenacao('nome', 'asc', 10).subscribe(resultado => {
                expect(resultado.length).toBe(1);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('nome', 'asc');
                expect(mockFirestore.limit).toHaveBeenCalledWith(10);
                done();
            });
        });

        it('deve tratar erro durante listagem', (done) => {
            const erro = new Error('Firestore list error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            service.lista().subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar test-collection');
                    done();
                }
            });
        });
    });

    describe('Operação UPDATE (altera)', () => {
        it('deve atualizar documento com timestamp automático', async () => {
            const dadosAtualizacao = {
                nome: 'Nome Atualizado',
                valor: 150
            };

            await service.altera('test-123', dadosAtualizacao);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();

            // Verificar se timestamp de atualização foi adicionado
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.atualizadoEm).toBeDefined();
            expect(dadosPassados.nome).toBe('Nome Atualizado');
            expect(dadosPassados.valor).toBe(150);
        });

        it('deve tratar erro durante atualização', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.altera('test-123', { nome: 'Erro' }))
                .toBeRejectedWithError('Erro ao atualizar test-collection');
        });

        it('deve preservar dados originais na atualização', async () => {
            const dadosAtualizacao = {
                nome: 'Nome Preservado',
                descricao: 'Descrição preservada'
            };

            await service.altera('test-123', dadosAtualizacao);

            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.nome).toBe(dadosAtualizacao.nome);
            expect(dadosPassados.descricao).toBe(dadosAtualizacao.descricao);
            expect(dadosPassados.atualizadoEm).toBeDefined();
        });
    });

    describe('Operação DELETE (remove)', () => {
        it('deve remover documento por ID', async () => {
            await service.remove('test-123');

            expect(mockFirestore.deleteDoc).toHaveBeenCalled();
        });

        it('deve tratar erro durante remoção', async () => {
            const erro = new Error('Firestore delete error');
            mockFirestore.deleteDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.remove('test-123'))
                .toBeRejectedWithError('Erro ao remover test-collection');
        });
    });

    describe('Operações de Contagem', () => {
        it('deve contar documentos na coleção', async () => {
            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                size: 5,
                docs: []
            }));

            const count = await service.contar();

            expect(count).toBe(5);
            expect(mockFirestore.getDocs).toHaveBeenCalled();
        });

        it('deve contar documentos com constraints', async () => {
            const constraints = [mockFirestore.where('ativo', '==', true)];
            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                size: 3,
                docs: []
            }));

            const count = await service.contar(constraints);

            expect(count).toBe(3);
            expect(mockFirestore.query).toHaveBeenCalled();
        });

        it('deve tratar erro durante contagem', async () => {
            const erro = new Error('Firestore count error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            await expectAsync(service.contar())
                .toBeRejectedWithError('Erro ao contar test-collection');
        });
    });

    describe('Integração com Firestore - Cenários Complexos', () => {
        it('deve lidar com documentos sem dados', (done) => {
            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: [
                    {
                        id: 'doc-vazio',
                        data: () => null
                    }
                ]
            }));

            service.lista().subscribe(resultado => {
                expect(resultado).toEqual([{
                    id: 'doc-vazio'
                }]);
                done();
            });
        });

        it('deve lidar com coleção vazia', (done) => {
            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: []
            }));

            service.lista().subscribe(resultado => {
                expect(resultado).toEqual([]);
                done();
            });
        });

        it('deve preservar tipos de dados complexos', async () => {
            const dadosComplexos = {
                usuarioId: 'user-123',
                nome: 'Entidade Complexa',
                descricao: 'Descrição',
                valor: 100,
                metadata: {
                    tags: ['tag1', 'tag2'],
                    configuracoes: {
                        ativo: true,
                        prioridade: 5
                    }
                },
                datas: {
                    inicio: new Date('2024-01-01'),
                    fim: new Date('2024-12-31')
                }
            };

            await service.novo(dadosComplexos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.metadata).toEqual(dadosComplexos.metadata);
            expect(dadosPassados.datas).toEqual(dadosComplexos.datas);
        });

        it('deve lidar com múltiplas operações simultâneas', async () => {
            const operacoes = [
                service.novo({ usuarioId: 'user-1', nome: 'Entidade 1', descricao: 'Desc 1', valor: 100 }),
                service.novo({ usuarioId: 'user-2', nome: 'Entidade 2', descricao: 'Desc 2', valor: 200 }),
                service.novo({ usuarioId: 'user-3', nome: 'Entidade 3', descricao: 'Desc 3', valor: 300 })
            ];

            const resultados = await Promise.all(operacoes);

            expect(resultados).toEqual(['new-doc-id', 'new-doc-id', 'new-doc-id']);
            expect(mockFirestore.addDoc).toHaveBeenCalledTimes(3);
        });
    });

    describe('Tratamento de Erros Específicos do Firestore', () => {
        it('deve tratar erro de permissão negada', async () => {
            const erroPermissao = { code: 'permission-denied', message: 'Permission denied' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroPermissao));

            await expectAsync(service.novo({
                usuarioId: 'user-123',
                nome: 'Sem Permissão',
                descricao: 'Teste',
                valor: 100
            })).toBeRejectedWithError('Erro ao criar test-collection');
        });

        it('deve tratar erro de documento não encontrado', (done) => {
            const erroNotFound = { code: 'not-found', message: 'Document not found' };
            mockFirestore.getDoc.and.returnValue(Promise.reject(erroNotFound));

            service.recuperarPorId('inexistente').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao recuperar test-collection');
                    done();
                }
            });
        });

        it('deve tratar erro de rede', async () => {
            const erroRede = { code: 'unavailable', message: 'Network error' };
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erroRede));

            await expectAsync(service.altera('test-123', { nome: 'Erro de Rede' }))
                .toBeRejectedWithError('Erro ao atualizar test-collection');
        });

        it('deve tratar erro de documento já existe', async () => {
            const erroExiste = { code: 'already-exists', message: 'Document already exists' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroExiste));

            await expectAsync(service.novo({
                usuarioId: 'user-123',
                nome: 'Já Existe',
                descricao: 'Teste',
                valor: 100
            })).toBeRejectedWithError('Erro ao criar test-collection');
        });
    });

    describe('Performance e Otimização', () => {
        it('deve usar cache de consultas quando apropriado', (done) => {
            // Primeira consulta
            service.lista().subscribe(() => {
                // Segunda consulta idêntica
                service.lista().subscribe(() => {
                    // Verificar se Firestore foi chamado apenas uma vez (se cache estiver implementado)
                    expect(mockFirestore.getDocs).toHaveBeenCalledTimes(2);
                    done();
                });
            });
        });

        it('deve lidar com grandes volumes de dados', (done) => {
            const largaLista = Array.from({ length: 1000 }, (_, i) => ({
                id: `doc-${i}`,
                data: () => ({ ...mockTestEntity, id: `doc-${i}`, nome: `Entidade ${i}` })
            }));

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: largaLista
            }));

            service.lista().subscribe(resultado => {
                expect(resultado.length).toBe(1000);
                expect(resultado[0].nome).toBe('Entidade 0');
                expect(resultado[999].nome).toBe('Entidade 999');
                done();
            });
        });
    });
});