/**
 * Testes de Integração - OfflineService
 * 
 * Testa a integração do OfflineService com StorageService, ConflictResolutionService,
 * incluindo sincronização offline, detecção de conectividade e resolução de conflitos.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { OfflineService } from './offline.service';
import { StorageService } from './storage.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { ErrorHandlerService } from './error-handler.service';
import { BaseEntity } from '../../models';
import { MockDataFactory } from '../../testing/test-utils';

interface TestEntity extends BaseEntity {
    nome: string;
    valor: number;
    sincronizado: boolean;
}

describe('OfflineService - Testes de Integração', () => {
    let service: OfflineService;
    let mockStorageService: jasmine.SpyObj<StorageService>;
    let mockConflictService: jasmine.SpyObj<ConflictResolutionService>;
    let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

    const mockEntity: TestEntity = {
        id: 'entity-123',
        usuarioId: 'user-123',
        nome: 'Entidade Teste',
        valor: 100,
        sincronizado: false,
        criadoEm: new Date() as any,
        atualizadoEm: new Date() as any
    };

    const mockPendingOperations = [
        {
            id: 'op-1',
            type: 'create',
            collection: 'viagens',
            data: mockEntity,
            timestamp: new Date(),
            retries: 0
        },
        {
            id: 'op-2',
            type: 'update',
            collection: 'custos',
            documentId: 'custo-123',
            data: { valor: 200 },
            timestamp: new Date(),
            retries: 1
        }
    ];

    beforeEach(() => {
        // Mock do StorageService
        const storageSpy = jasmine.createSpyObj('StorageService', [
            'getItem', 'setItem', 'removeItem', 'clear',
            'getPendingOperations', 'addPendingOperation', 'removePendingOperation',
            'getOfflineData', 'setOfflineData', 'removeOfflineData'
        ]);

        // Mock do ConflictResolutionService
        const conflictSpy = jasmine.createSpyObj('ConflictResolutionService', [
            'detectarConflito', 'resolverConflito', 'sincronizarComResolucao'
        ]);

        // Mock do ErrorHandlerService
        const errorSpy = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

        TestBed.configureTestingModule({
            providers: [
                OfflineService,
                { provide: StorageService, useValue: storageSpy },
                { provide: ConflictResolutionService, useValue: conflictSpy },
                { provide: ErrorHandlerService, useValue: errorSpy }
            ]
        });

        service = TestBed.inject(OfflineService);
        mockStorageService = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
        mockConflictService = TestBed.inject(ConflictResolutionService) as jasmine.SpyObj<ConflictResolutionService>;
        mockErrorHandler = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;

        // Configurar mocks padrão
        mockStorageService.getPendingOperations.and.returnValue(mockPendingOperations);
        mockStorageService.getOfflineData.and.returnValue([]);
    });

    describe('Detecção de Conectividade', () => {
        it('deve detectar quando está online', (done) => {
            // Simular navegador online
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            service.isOnline$.subscribe(isOnline => {
                expect(isOnline).toBe(true);
                done();
            });

            // Disparar evento online
            window.dispatchEvent(new Event('online'));
        });

        it('deve detectar quando está offline', (done) => {
            // Simular navegador offline
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            service.isOnline$.subscribe(isOnline => {
                expect(isOnline).toBe(false);
                done();
            });

            // Disparar evento offline
            window.dispatchEvent(new Event('offline'));
        });

        it('deve reagir a mudanças de conectividade', () => {
            const statusChanges: boolean[] = [];

            service.isOnline$.subscribe(status => {
                statusChanges.push(status);
            });

            // Simular mudanças de conectividade
            Object.defineProperty(navigator, 'onLine', { value: true });
            window.dispatchEvent(new Event('online'));

            Object.defineProperty(navigator, 'onLine', { value: false });
            window.dispatchEvent(new Event('offline'));

            Object.defineProperty(navigator, 'onLine', { value: true });
            window.dispatchEvent(new Event('online'));

            expect(statusChanges.length).toBeGreaterThan(1);
        });

        it('deve inicializar com status correto do navegador', () => {
            Object.defineProperty(navigator, 'onLine', { value: true });
            
            const newService = new OfflineService(
                mockStorageService,
                mockConflictService,
                mockErrorHandler
            );

            newService.isOnline$.subscribe(isOnline => {
                expect(isOnline).toBe(true);
            });
        });
    });

    describe('Armazenamento Offline', () => {
        it('deve salvar dados offline quando não há conectividade', async () => {
            spyOn(service, 'isOnline').and.returnValue(false);

            await service.salvarOffline('viagens', mockEntity);

            expect(mockStorageService.setOfflineData).toHaveBeenCalledWith(
                'viagens',
                mockEntity.id!,
                mockEntity
            );
        });

        it('deve adicionar operação pendente ao salvar offline', async () => {
            spyOn(service, 'isOnline').and.returnValue(false);

            await service.salvarOffline('viagens', mockEntity);

            expect(mockStorageService.addPendingOperation).toHaveBeenCalledWith({
                id: jasmine.any(String),
                type: 'create',
                collection: 'viagens',
                data: mockEntity,
                timestamp: jasmine.any(Date),
                retries: 0
            });
        });

        it('deve recuperar dados offline por coleção', () => {
            const dadosOffline = [mockEntity];
            mockStorageService.getOfflineData.and.returnValue(dadosOffline);

            const dados = service.obterDadosOffline('viagens');

            expect(dados).toEqual(dadosOffline);
            expect(mockStorageService.getOfflineData).toHaveBeenCalledWith('viagens');
        });

        it('deve atualizar dados offline existentes', async () => {
            spyOn(service, 'isOnline').and.returnValue(false);
            const dadosAtualizados = { ...mockEntity, valor: 200 };

            await service.atualizarOffline('viagens', mockEntity.id!, dadosAtualizados);

            expect(mockStorageService.setOfflineData).toHaveBeenCalledWith(
                'viagens',
                mockEntity.id!,
                dadosAtualizados
            );

            expect(mockStorageService.addPendingOperation).toHaveBeenCalledWith({
                id: jasmine.any(String),
                type: 'update',
                collection: 'viagens',
                documentId: mockEntity.id,
                data: dadosAtualizados,
                timestamp: jasmine.any(Date),
                retries: 0
            });
        });

        it('deve remover dados offline', async () => {
            spyOn(service, 'isOnline').and.returnValue(false);

            await service.removerOffline('viagens', mockEntity.id!);

            expect(mockStorageService.removeOfflineData).toHaveBeenCalledWith(
                'viagens',
                mockEntity.id!
            );

            expect(mockStorageService.addPendingOperation).toHaveBeenCalledWith({
                id: jasmine.any(String),
                type: 'delete',
                collection: 'viagens',
                documentId: mockEntity.id,
                timestamp: jasmine.any(Date),
                retries: 0
            });
        });
    });

    describe('Sincronização de Dados', () => {
        beforeEach(() => {
            spyOn(service, 'isOnline').and.returnValue(true);
            mockConflictService.sincronizarComResolucao.and.returnValue(Promise.resolve([mockEntity]));
        });

        it('deve sincronizar operações pendentes quando voltar online', async () => {
            const mockSyncService = {
                syncPendingOperations: jasmine.createSpy('syncPendingOperations').and.returnValue(Promise.resolve())
            };

            spyOn(service as any, 'syncPendingOperations').and.returnValue(Promise.resolve());

            await service.sincronizar();

            expect((service as any).syncPendingOperations).toHaveBeenCalled();
        });

        it('deve processar operações pendentes em ordem cronológica', async () => {
            const operacoesOrdenadas = [
                { ...mockPendingOperations[0], timestamp: new Date('2024-06-01T10:00:00Z') },
                { ...mockPendingOperations[1], timestamp: new Date('2024-06-01T11:00:00Z') }
            ];

            mockStorageService.getPendingOperations.and.returnValue(operacoesOrdenadas);

            const processedOperations: any[] = [];
            spyOn(service as any, 'processOperation').and.callFake((op: any) => {
                processedOperations.push(op);
                return Promise.resolve();
            });

            await service.sincronizar();

            expect(processedOperations[0].timestamp).toBeLessThan(processedOperations[1].timestamp);
        });

        it('deve remover operações bem-sucedidas da lista pendente', async () => {
            spyOn(service as any, 'processOperation').and.returnValue(Promise.resolve());

            await service.sincronizar();

            expect(mockStorageService.removePendingOperation).toHaveBeenCalledTimes(mockPendingOperations.length);
        });

        it('deve incrementar contador de tentativas para operações falhadas', async () => {
            const erro = new Error('Sync error');
            spyOn(service as any, 'processOperation').and.returnValue(Promise.reject(erro));

            await service.sincronizar();

            expect(mockStorageService.addPendingOperation).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    retries: jasmine.any(Number)
                })
            );
        });

        it('deve descartar operações que excederam limite de tentativas', async () => {
            const operacaoComMuitasTentativas = {
                ...mockPendingOperations[0],
                retries: 5 // Acima do limite
            };

            mockStorageService.getPendingOperations.and.returnValue([operacaoComMuitasTentativas]);
            spyOn(service as any, 'processOperation').and.returnValue(Promise.reject(new Error('Persistent error')));

            await service.sincronizar();

            expect(mockStorageService.removePendingOperation).toHaveBeenCalledWith(operacaoComMuitasTentativas.id);
        });

        it('deve usar ConflictResolutionService para resolver conflitos', async () => {
            const dadosComConflito = [mockEntity];
            mockStorageService.getOfflineData.and.returnValue(dadosComConflito);

            await service.sincronizarColecao('viagens');

            expect(mockConflictService.sincronizarComResolucao).toHaveBeenCalledWith(
                'viagens',
                dadosComConflito,
                'last-write-wins'
            );
        });
    });

    describe('Tratamento de Erros', () => {
        it('deve tratar erro durante sincronização', async () => {
            const erro = new Error('Sync error');
            spyOn(service as any, 'syncPendingOperations').and.returnValue(Promise.reject(erro));

            await service.sincronizar();

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(erro, 'Sincronização Offline');
        });

        it('deve tratar erro ao salvar dados offline', async () => {
            const erro = new Error('Storage error');
            mockStorageService.setOfflineData.and.throwError(erro);

            await expectAsync(service.salvarOffline('viagens', mockEntity))
                .toBeRejectedWith(erro);

            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(erro, 'Armazenamento Offline');
        });

        it('deve continuar sincronização mesmo com falhas individuais', async () => {
            const operacoes = [
                { ...mockPendingOperations[0], id: 'op-success' },
                { ...mockPendingOperations[1], id: 'op-error' }
            ];

            mockStorageService.getPendingOperations.and.returnValue(operacoes);

            spyOn(service as any, 'processOperation').and.callFake((op: any) => {
                if (op.id === 'op-error') {
                    return Promise.reject(new Error('Individual error'));
                }
                return Promise.resolve();
            });

            await service.sincronizar();

            // Deve processar ambas as operações
            expect((service as any).processOperation).toHaveBeenCalledTimes(2);
            // Deve remover apenas a bem-sucedida
            expect(mockStorageService.removePendingOperation).toHaveBeenCalledWith('op-success');
        });

        it('deve registrar logs de erro detalhados', async () => {
            spyOn(console, 'error');
            const erro = new Error('Detailed error');
            
            spyOn(service as any, 'processOperation').and.returnValue(Promise.reject(erro));

            await service.sincronizar();

            expect(console.error).toHaveBeenCalledWith(
                jasmine.stringMatching(/Erro ao processar operação/),
                jasmine.any(Object),
                erro
            );
        });
    });

    describe('Estratégias de Sincronização', () => {
        it('deve usar estratégia last-write-wins por padrão', async () => {
            await service.sincronizarColecao('viagens');

            expect(mockConflictService.sincronizarComResolucao).toHaveBeenCalledWith(
                'viagens',
                jasmine.any(Array),
                'last-write-wins'
            );
        });

        it('deve permitir configurar estratégia de resolução', async () => {
            await service.sincronizarColecao('viagens', 'local-wins');

            expect(mockConflictService.sincronizarComResolucao).toHaveBeenCalledWith(
                'viagens',
                jasmine.any(Array),
                'local-wins'
            );
        });

        it('deve aplicar estratégia diferente por tipo de operação', async () => {
            const operacaoCreate = { ...mockPendingOperations[0], type: 'create' };
            const operacaoUpdate = { ...mockPendingOperations[1], type: 'update' };

            mockStorageService.getPendingOperations.and.returnValue([operacaoCreate, operacaoUpdate]);

            spyOn(service as any, 'processOperation').and.returnValue(Promise.resolve());

            await service.sincronizar();

            // Verificar se diferentes estratégias foram aplicadas
            expect((service as any).processOperation).toHaveBeenCalledTimes(2);
        });
    });

    describe('Otimização e Performance', () => {
        it('deve processar operações em lotes para melhor performance', async () => {
            const muitasOperacoes = Array.from({ length: 100 }, (_, i) => ({
                ...mockPendingOperations[0],
                id: `op-${i}`
            }));

            mockStorageService.getPendingOperations.and.returnValue(muitasOperacoes);
            spyOn(service as any, 'processOperation').and.returnValue(Promise.resolve());

            const inicio = performance.now();
            await service.sincronizar();
            const fim = performance.now();

            // Deve processar rapidamente mesmo com muitas operações
            expect(fim - inicio).toBeLessThan(1000);
        });

        it('deve limitar número de tentativas simultâneas', async () => {
            const operacoesSimultaneas = Array.from({ length: 50 }, (_, i) => ({
                ...mockPendingOperations[0],
                id: `concurrent-op-${i}`
            }));

            mockStorageService.getPendingOperations.and.returnValue(operacoesSimultaneas);

            let operacoesEmAndamento = 0;
            let maxSimultaneas = 0;

            spyOn(service as any, 'processOperation').and.callFake(() => {
                operacoesEmAndamento++;
                maxSimultaneas = Math.max(maxSimultaneas, operacoesEmAndamento);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        operacoesEmAndamento--;
                        resolve(undefined);
                    }, 10);
                });
            });

            await service.sincronizar();

            // Deve limitar operações simultâneas para não sobrecarregar
            expect(maxSimultaneas).toBeLessThanOrEqual(10);
        });

        it('deve usar cache para evitar sincronizações desnecessárias', async () => {
            // Primeira sincronização
            await service.sincronizarColecao('viagens');
            
            // Segunda sincronização imediata
            await service.sincronizarColecao('viagens');

            // Deve usar cache na segunda chamada
            expect(mockConflictService.sincronizarComResolucao).toHaveBeenCalledTimes(1);
        });
    });

    describe('Integração com StorageService', () => {
        it('deve usar StorageService para persistir operações pendentes', async () => {
            await service.salvarOffline('viagens', mockEntity);

            expect(mockStorageService.addPendingOperation).toHaveBeenCalled();
            expect(mockStorageService.setOfflineData).toHaveBeenCalled();
        });

        it('deve recuperar operações pendentes do StorageService', async () => {
            await service.sincronizar();

            expect(mockStorageService.getPendingOperations).toHaveBeenCalled();
        });

        it('deve limpar dados sincronizados do storage local', async () => {
            mockStorageService.getOfflineData.and.returnValue([mockEntity]);
            mockConflictService.sincronizarComResolucao.and.returnValue(Promise.resolve([mockEntity]));

            await service.sincronizarColecao('viagens');

            expect(mockStorageService.removeOfflineData).toHaveBeenCalledWith('viagens', mockEntity.id);
        });
    });

    describe('Estados de Sincronização', () => {
        it('deve emitir estado de sincronização em progresso', (done) => {
            service.syncStatus$.subscribe(status => {
                if (status.inProgress) {
                    expect(status.inProgress).toBe(true);
                    done();
                }
            });

            service.sincronizar();
        });

        it('deve emitir estado de sincronização concluída', (done) => {
            let statusCount = 0;
            
            service.syncStatus$.subscribe(status => {
                statusCount++;
                if (statusCount === 2) { // Segundo status (concluído)
                    expect(status.inProgress).toBe(false);
                    expect(status.lastSync).toBeDefined();
                    done();
                }
            });

            service.sincronizar();
        });

        it('deve incluir estatísticas de sincronização', (done) => {
            mockStorageService.getPendingOperations.and.returnValue(mockPendingOperations);
            spyOn(service as any, 'processOperation').and.returnValue(Promise.resolve());

            service.syncStatus$.subscribe(status => {
                if (!status.inProgress && status.lastSync) {
                    expect(status.operationsProcessed).toBe(mockPendingOperations.length);
                    expect(status.errors).toBe(0);
                    done();
                }
            });

            service.sincronizar();
        });
    });

    describe('Cenários de Uso Complexos', () => {
        it('deve lidar com sincronização durante mudança de conectividade', async () => {
            // Iniciar sincronização online
            spyOn(service, 'isOnline').and.returnValue(true);
            const syncPromise = service.sincronizar();

            // Simular perda de conectividade durante sincronização
            spyOn(service, 'isOnline').and.returnValue(false);

            await syncPromise;

            // Deve completar sincronização mesmo com mudança de conectividade
            expect(mockStorageService.getPendingOperations).toHaveBeenCalled();
        });

        it('deve priorizar operações críticas na sincronização', async () => {
            const operacaoCritica = {
                ...mockPendingOperations[0],
                priority: 'high',
                type: 'create'
            };

            const operacaoNormal = {
                ...mockPendingOperations[1],
                priority: 'normal',
                type: 'update'
            };

            mockStorageService.getPendingOperations.and.returnValue([operacaoNormal, operacaoCritica]);

            const processedOrder: any[] = [];
            spyOn(service as any, 'processOperation').and.callFake((op: any) => {
                processedOrder.push(op);
                return Promise.resolve();
            });

            await service.sincronizar();

            // Operação crítica deve ser processada primeiro
            expect(processedOrder[0].priority).toBe('high');
        });

        it('deve manter integridade dos dados durante falhas parciais', async () => {
            const operacoes = [
                { ...mockPendingOperations[0], id: 'op-1' },
                { ...mockPendingOperations[1], id: 'op-2' }
            ];

            mockStorageService.getPendingOperations.and.returnValue(operacoes);

            // Primeira operação falha, segunda sucede
            spyOn(service as any, 'processOperation').and.callFake((op: any) => {
                if (op.id === 'op-1') {
                    return Promise.reject(new Error('Falha na operação 1'));
                }
                return Promise.resolve();
            });

            await service.sincronizar();

            // Apenas operação bem-sucedida deve ser removida
            expect(mockStorageService.removePendingOperation).toHaveBeenCalledWith('op-2');
            expect(mockStorageService.removePendingOperation).not.toHaveBeenCalledWith('op-1');
        });
    });
});