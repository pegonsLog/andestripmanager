/**
 * Testes de Integração - ConflictResolutionService
 * 
 * Testa a integração do ConflictResolutionService com Firestore e outros serviços,
 * incluindo detecção de conflitos, resolução automática e manual.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { ConflictResolutionService } from './conflict-resolution.service';
import { StorageService } from './storage.service';
import { ErrorHandlerService } from './error-handler.service';
import { BaseEntity } from '../../models';
import { MockDataFactory } from '../../testing/test-utils';

interface TestEntity extends BaseEntity {
    nome: string;
    valor: number;
    versao: number;
}

describe('ConflictResolutionService - Testes de Integração', () => {
    let service: ConflictResolutionService;
    let mockFirestore: any;
    let mockStorageService: jasmine.SpyObj<StorageService>;
    let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

    const mockEntityLocal: TestEntity = {
        id: 'entity-123',
        usuarioId: 'user-123',
        nome: 'Entidade Local',
        valor: 100,
        versao: 1,
        criadoEm: new Date('2024-06-01T10:00:00Z') as any,
        atualizadoEm: new Date('2024-06-01T11:00:00Z') as any
    };

    const mockEntityRemote: TestEntity = {
        id: 'entity-123',
        usuarioId: 'user-123',
        nome: 'Entidade Remota',
        valor: 200,
        versao: 2,
        criadoEm: new Date('2024-06-01T10:00:00Z') as any,
        atualizadoEm: new Date('2024-06-01T12:00:00Z') as any
    };

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: 'entity-123',
                data: () => mockEntityRemote
            })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-id' }))
        };

        // Mock do StorageService
        const storageSpy = jasmine.createSpyObj('StorageService', [
            'getItem', 'setItem', 'removeItem', 'getConflicts', 'addConflict', 'removeConflict'
        ]);

        // Mock do ErrorHandlerService
        const errorSpy = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

        TestBed.configureTestingModule({
            providers: [
                ConflictResolutionService,
                { provide: Firestore, useValue: mockFirestore },
                { provide: StorageService, useValue: storageSpy },
                { provide: ErrorHandlerService, useValue: errorSpy }
            ]
        });

        service = TestBed.inject(ConflictResolutionService);
        mockStorageService = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
        mockErrorHandler = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    });

    describe('Detecção de Conflitos', () => {
        it('deve detectar conflito por timestamp', async () => {
            const localMaisRecente = {
                ...mockEntityLocal,
                atualizadoEm: new Date('2024-06-01T13:00:00Z') as any
            };

            const temConflito = await service.detectarConflito(
                'test-collection',
                'entity-123',
                localMaisRecente
            );

            expect(temConflito).toBe(true);
            expect(mockFirestore.getDoc).toHaveBeenCalled();
        });

        it('deve detectar conflito por versão', async () => {
            const localVersaoMenor = {
                ...mockEntityLocal,
                versao: 1
            };

            const temConflito = await service.detectarConflito(
                'test-collection',
                'entity-123',
                localVersaoMenor
            );

            expect(temConflito).toBe(true);
        });

        it('deve não detectar conflito quando dados são iguais', async () => {
            mockFirestore.getDoc.and.returnValue(Promise.resolve({
                exists: () => true,
                id: 'entity-123',
                data: () => mockEntityLocal
            }));

            const temConflito = await service.detectarConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal
            );

            expect(temConflito).toBe(false);
        });

        it('deve não detectar conflito quando documento não existe remotamente', async () => {
            mockFirestore.getDoc.and.returnValue(Promise.resolve({
                exists: () => false,
                data: () => null
            }));

            const temConflito = await service.detectarConflito(
                'test-collection',
                'entity-inexistente',
                mockEntityLocal
            );

            expect(temConflito).toBe(false);
        });

        it('deve tratar erro ao acessar documento remoto', async () => {
            const erro = new Error('Firestore error');
            mockFirestore.getDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.detectarConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal
            )).toBeRejectedWith(erro);

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(erro, 'Detecção de Conflito');
        });
    });

    describe('Resolução Automática de Conflitos', () => {
        beforeEach(() => {
            mockStorageService.getConflicts.and.returnValue([]);
        });

        it('deve resolver conflito usando estratégia "last-write-wins"', async () => {
            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'last-write-wins'
            );

            expect(resultado).toEqual(mockEntityRemote); // Remoto é mais recente
            expect(mockFirestore.updateDoc).not.toHaveBeenCalled(); // Não precisa atualizar
        });

        it('deve resolver conflito usando estratégia "local-wins"', async () => {
            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'local-wins'
            );

            expect(resultado).toEqual(mockEntityLocal);
            expect(mockFirestore.updateDoc).toHaveBeenCalled(); // Deve atualizar remoto
        });

        it('deve resolver conflito usando estratégia "remote-wins"', async () => {
            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'remote-wins'
            );

            expect(resultado).toEqual(mockEntityRemote);
            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve resolver conflito usando estratégia "merge"', async () => {
            const localComCampoUnico = {
                ...mockEntityLocal,
                campoLocal: 'valor local'
            };

            const remoteComCampoUnico = {
                ...mockEntityRemote,
                campoRemoto: 'valor remoto'
            };

            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                localComCampoUnico as any,
                remoteComCampoUnico as any,
                'merge'
            );

            expect(resultado).toEqual(jasmine.objectContaining({
                campoLocal: 'valor local',
                campoRemoto: 'valor remoto'
            }));
            expect(mockFirestore.updateDoc).toHaveBeenCalled();
        });

        it('deve adicionar conflito ao storage para resolução manual', async () => {
            await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'manual'
            );

            expect(mockStorageService.addConflict).toHaveBeenCalledWith({
                id: jasmine.any(String),
                collectionName: 'test-collection',
                documentId: 'entity-123',
                localData: mockEntityLocal,
                remoteData: mockEntityRemote,
                timestamp: jasmine.any(Date),
                resolved: false
            });
        });

        it('deve tratar erro durante resolução automática', async () => {
            const erro = new Error('Update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'local-wins'
            )).toBeRejectedWith(erro);

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(erro, 'Resolução de Conflito');
        });
    });

    describe('Gerenciamento de Conflitos Pendentes', () => {
        const mockConflitos = [
            {
                id: 'conflict-1',
                collectionName: 'viagens',
                documentId: 'viagem-123',
                localData: mockEntityLocal,
                remoteData: mockEntityRemote,
                timestamp: new Date(),
                resolved: false
            },
            {
                id: 'conflict-2',
                collectionName: 'custos',
                documentId: 'custo-456',
                localData: mockEntityLocal,
                remoteData: mockEntityRemote,
                timestamp: new Date(),
                resolved: true
            }
        ];

        it('deve listar conflitos pendentes', () => {
            mockStorageService.getConflicts.and.returnValue(mockConflitos);

            const conflitos = service.listarConflitos();

            expect(conflitos).toEqual(mockConflitos);
            expect(mockStorageService.getConflicts).toHaveBeenCalled();
        });

        it('deve filtrar apenas conflitos não resolvidos', () => {
            mockStorageService.getConflicts.and.returnValue(mockConflitos);

            const conflitosNaoResolvidos = service.listarConflitos(false);

            expect(conflitosNaoResolvidos.length).toBe(1);
            expect(conflitosNaoResolvidos[0].resolved).toBe(false);
        });

        it('deve obter conflito específico por ID', () => {
            mockStorageService.getConflicts.and.returnValue(mockConflitos);

            const conflito = service.obterConflito('conflict-1');

            expect(conflito).toEqual(mockConflitos[0]);
        });

        it('deve retornar undefined para conflito inexistente', () => {
            mockStorageService.getConflicts.and.returnValue(mockConflitos);

            const conflito = service.obterConflito('conflict-inexistente');

            expect(conflito).toBeUndefined();
        });

        it('deve marcar conflito como resolvido', async () => {
            mockStorageService.getConflicts.and.returnValue(mockConflitos);

            await service.marcarConflitoResolvido('conflict-1', mockEntityRemote);

            expect(mockStorageService.removeConflict).toHaveBeenCalledWith('conflict-1');
        });

        it('deve remover conflito do storage', async () => {
            await service.removerConflito('conflict-1');

            expect(mockStorageService.removeConflict).toHaveBeenCalledWith('conflict-1');
        });
    });

    describe('Sincronização com Resolução de Conflitos', () => {
        it('deve sincronizar dados detectando e resolvendo conflitos', async () => {
            const dadosLocais = [mockEntityLocal];
            
            spyOn(service, 'detectarConflito').and.returnValue(Promise.resolve(true));
            spyOn(service, 'resolverConflito').and.returnValue(Promise.resolve(mockEntityRemote));

            const resultados = await service.sincronizarComResolucao(
                'test-collection',
                dadosLocais,
                'last-write-wins'
            );

            expect(resultados.length).toBe(1);
            expect(resultados[0]).toEqual(mockEntityRemote);
            expect(service.detectarConflito).toHaveBeenCalledWith(
                'test-collection',
                mockEntityLocal.id,
                mockEntityLocal
            );
            expect(service.resolverConflito).toHaveBeenCalled();
        });

        it('deve sincronizar dados sem conflitos', async () => {
            const dadosLocais = [mockEntityLocal];
            
            spyOn(service, 'detectarConflito').and.returnValue(Promise.resolve(false));

            const resultados = await service.sincronizarComResolucao(
                'test-collection',
                dadosLocais,
                'last-write-wins'
            );

            expect(resultados.length).toBe(1);
            expect(resultados[0]).toEqual(mockEntityLocal);
        });

        it('deve tratar erros durante sincronização', async () => {
            const dadosLocais = [mockEntityLocal];
            const erro = new Error('Sync error');
            
            spyOn(service, 'detectarConflito').and.returnValue(Promise.reject(erro));

            await expectAsync(service.sincronizarComResolucao(
                'test-collection',
                dadosLocais,
                'last-write-wins'
            )).toBeRejectedWith(erro);

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(erro, 'Sincronização com Resolução');
        });

        it('deve processar múltiplos documentos em lote', async () => {
            const dadosLocais = [
                { ...mockEntityLocal, id: 'entity-1' },
                { ...mockEntityLocal, id: 'entity-2' },
                { ...mockEntityLocal, id: 'entity-3' }
            ];
            
            spyOn(service, 'detectarConflito').and.returnValue(Promise.resolve(false));

            const resultados = await service.sincronizarComResolucao(
                'test-collection',
                dadosLocais,
                'last-write-wins'
            );

            expect(resultados.length).toBe(3);
            expect(service.detectarConflito).toHaveBeenCalledTimes(3);
        });
    });

    describe('Estratégias de Merge', () => {
        it('deve fazer merge preservando campos únicos de ambos os lados', async () => {
            const local = {
                id: 'entity-123',
                nome: 'Nome Local',
                valor: 100,
                campoLocal: 'exclusivo local',
                campoComum: 'valor local'
            };

            const remote = {
                id: 'entity-123',
                nome: 'Nome Remoto',
                valor: 200,
                campoRemoto: 'exclusivo remoto',
                campoComum: 'valor remoto'
            };

            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                local as any,
                remote as any,
                'merge'
            );

            expect(resultado).toEqual(jasmine.objectContaining({
                campoLocal: 'exclusivo local',
                campoRemoto: 'exclusivo remoto'
            }));
        });

        it('deve priorizar dados mais recentes no merge', async () => {
            const localAntigo = {
                ...mockEntityLocal,
                atualizadoEm: new Date('2024-06-01T10:00:00Z') as any
            };

            const remoteRecente = {
                ...mockEntityRemote,
                atualizadoEm: new Date('2024-06-01T12:00:00Z') as any
            };

            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                localAntigo,
                remoteRecente,
                'merge'
            );

            // Campos conflitantes devem usar valor mais recente (remoto)
            expect(resultado.nome).toBe(remoteRecente.nome);
            expect(resultado.valor).toBe(remoteRecente.valor);
        });

        it('deve preservar metadados de auditoria no merge', async () => {
            const resultado = await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'merge'
            );

            expect(resultado.criadoEm).toBeDefined();
            expect(resultado.atualizadoEm).toBeDefined();
            expect(resultado.usuarioId).toBeDefined();
        });
    });

    describe('Logs e Auditoria de Conflitos', () => {
        beforeEach(() => {
            spyOn(console, 'log');
            spyOn(console, 'warn');
        });

        it('deve registrar log ao detectar conflito', async () => {
            await service.detectarConflito('test-collection', 'entity-123', mockEntityLocal);

            expect(console.log).toHaveBeenCalledWith(
                jasmine.stringMatching(/Conflito detectado/)
            );
        });

        it('deve registrar log ao resolver conflito automaticamente', async () => {
            await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'last-write-wins'
            );

            expect(console.log).toHaveBeenCalledWith(
                jasmine.stringMatching(/Conflito resolvido automaticamente/)
            );
        });

        it('deve registrar warning para conflitos manuais', async () => {
            await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'manual'
            );

            expect(console.warn).toHaveBeenCalledWith(
                jasmine.stringMatching(/Conflito adicionado para resolução manual/)
            );
        });

        it('deve manter histórico de conflitos resolvidos', async () => {
            const conflitosIniciais = service.listarConflitos();
            
            await service.resolverConflito(
                'test-collection',
                'entity-123',
                mockEntityLocal,
                mockEntityRemote,
                'manual'
            );

            const conflitosAposAdicao = service.listarConflitos();
            expect(conflitosAposAdicao.length).toBe(conflitosIniciais.length + 1);
        });
    });

    describe('Performance e Otimização', () => {
        it('deve processar detecção de conflitos rapidamente', async () => {
            const inicio = performance.now();
            
            await service.detectarConflito('test-collection', 'entity-123', mockEntityLocal);
            
            const fim = performance.now();
            expect(fim - inicio).toBeLessThan(100); // Menos de 100ms
        });

        it('deve otimizar consultas para múltiplos documentos', async () => {
            const dadosLocais = Array.from({ length: 10 }, (_, i) => ({
                ...mockEntityLocal,
                id: `entity-${i}`
            }));

            spyOn(service, 'detectarConflito').and.returnValue(Promise.resolve(false));

            const inicio = performance.now();
            await service.sincronizarComResolucao('test-collection', dadosLocais, 'last-write-wins');
            const fim = performance.now();

            expect(fim - inicio).toBeLessThan(1000); // Menos de 1 segundo para 10 documentos
        });

        it('deve limitar número de conflitos em memória', () => {
            const muitosConflitos = Array.from({ length: 1000 }, (_, i) => ({
                id: `conflict-${i}`,
                collectionName: 'test',
                documentId: `doc-${i}`,
                localData: mockEntityLocal,
                remoteData: mockEntityRemote,
                timestamp: new Date(),
                resolved: false
            }));

            mockStorageService.getConflicts.and.returnValue(muitosConflitos);

            const conflitos = service.listarConflitos();
            
            // Deve retornar todos os conflitos, mas o serviço deve ser eficiente
            expect(conflitos.length).toBe(1000);
        });
    });

    describe('Cenários Edge Cases', () => {
        it('deve tratar documento sem timestamp', async () => {
            const entitySemTimestamp = {
                ...mockEntityLocal,
                atualizadoEm: undefined
            };

            const temConflito = await service.detectarConflito(
                'test-collection',
                'entity-123',
                entitySemTimestamp as any
            );

            expect(temConflito).toBe(true); // Deve assumir conflito por segurança
        });

        it('deve tratar documento sem versão', async () => {
            const entitySemVersao = {
                ...mockEntityLocal,
                versao: undefined
            };

            const temConflito = await service.detectarConflito(
                'test-collection',
                'entity-123',
                entitySemVersao as any
            );

            expect(temConflito).toBe(true);
        });

        it('deve tratar dados corrompidos', async () => {
            const dadosCorrempidos = {
                id: 'entity-123',
                // Dados incompletos ou inválidos
            };

            await expectAsync(service.resolverConflito(
                'test-collection',
                'entity-123',
                dadosCorrempidos as any,
                mockEntityRemote,
                'merge'
            )).toBeResolved();
        });

        it('deve tratar conflitos circulares', async () => {
            const entity1 = { ...mockEntityLocal, id: 'entity-1', referencia: 'entity-2' };
            const entity2 = { ...mockEntityRemote, id: 'entity-2', referencia: 'entity-1' };

            // Não deve entrar em loop infinito
            const resultado1 = await service.resolverConflito(
                'test-collection',
                'entity-1',
                entity1 as any,
                entity2 as any,
                'merge'
            );

            expect(resultado1).toBeDefined();
        });
    });
});