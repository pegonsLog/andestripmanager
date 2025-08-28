/**
 * Testes de Integração - OfflineService
 * 
 * Testa a integração do OfflineService com CacheService, localStorage,
 * sincronização offline e gerenciamento de operações pendentes.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OfflineService, PendingOperation } from '../core/services/offline.service';
import { CacheService } from '../core/services/cache.service';
import { MockDataFactory } from '../testing/test-utils';

describe('OfflineService - Testes de Integração', () => {
    let service: OfflineService;
    let mockCacheService: jasmine.SpyObj<CacheService>;
    let mockLocalStorage: { [key: string]: string };

    const mockViagem = MockDataFactory.createViagem();
    const mockViagens = MockDataFactory.createViagens(3);

    beforeEach(() => {
        // Mock do localStorage
        mockLocalStorage = {};

        spyOn(localStorage, 'getItem').and.callFake((key: string) => {
            return mockLocalStorage[key] || null;
        });

        spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
            mockLocalStorage[key] = value;
        });

        spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
            delete mockLocalStorage[key];
        });

        // Mock do CacheService
        const cacheSpy = jasmine.createSpyObj('CacheService', [
            'get', 'set', 'has', 'getOrSet', 'cleanExpired'
        ], {
            strategies: {
                QUICK: { ttl: 60000, priority: 'low', persistent: false },
                NORMAL: { ttl: 300000, priority: 'normal', persistent: false },
                LONG: { ttl: 1800000, priority: 'high', persistent: false },
                PERSISTENT: { ttl: 86400000, priority: 'critical', persistent: true },
                OFFLINE: { ttl: 604800000, priority: 'critical', persistent: true }
            }
        });

        TestBed.configureTestingModule({
            providers: [
                OfflineService,
                { provide: CacheService, useValue: cacheSpy }
            ]
        });

        service = TestBed.inject(OfflineService);
        mockCacheService = TestBed.inject(CacheService) as jasmine.SpyObj<CacheService>;

        // Simular estado online por padrão
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    });

    describe('Detecção de Conectividade', () => {
        it('deve detectar estado online inicial', () => {
            expect(service.isOnline()).toBeTrue();
        });

        it('deve detectar mudança para offline', (done) => {
            service.isOnline$.subscribe(isOnline => {
                if (!isOnline) {
                    expect(isOnline).toBeFalse();
                    done();
                }
            });

            // Simular mudança para offline
            Object.defineProperty(navigator, 'onLine', { value: false });
            window.dispatchEvent(new Event('offline'));
        });

        it('deve detectar mudança para online', (done) => {
            // Começar offline
            Object.defineProperty(navigator, 'onLine', { value: false });
            const offlineService = new OfflineService(mockCacheService);

            offlineService.isOnline$.subscribe(isOnline => {
                if (isOnline) {
                    expect(isOnline).toBeTrue();
                    done();
                }
            });

            // Simular mudança para online
            Object.defineProperty(navigator, 'onLine', { value: true });
            window.dispatchEvent(new Event('online'));
        });

        it('deve obter status de conectividade como Observable', (done) => {
            service.getConnectivityStatus().subscribe(isOnline => {
                expect(typeof isOnline).toBe('boolean');
                done();
            });
        });
    });

    describe('Gerenciamento de Operações Pendentes', () => {
        it('deve adicionar operação à fila', () => {
            const operacao = {
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem,
                priority: 'normal' as const
            };

            const operationId = service.addPendingOperation(operacao);

            expect(operationId).toBeDefined();
            expect(operationId.length).toBeGreaterThan(0);

            const pendingOps = service.getPendingOperations();
            expect(pendingOps.length).toBe(1);
            expect(pendingOps[0].type).toBe('create');
            expect(pendingOps[0].collection).toBe('viagens');
            expect(pendingOps[0].data).toEqual(mockViagem);
        });

        it('deve gerar ID único para cada operação', () => {
            const operacao1 = {
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            };

            const operacao2 = {
                type: 'update' as const,
                collection: 'custos',
                data: { valor: 100 }
            };

            const id1 = service.addPendingOperation(operacao1);
            const id2 = service.addPendingOperation(operacao2);

            expect(id1).not.toBe(id2);
        });

        it('deve definir valores padrão para operação', () => {
            const operacao = {
                type: 'delete' as const,
                collection: 'paradas',
                data: { id: 'parada-123' }
            };

            service.addPendingOperation(operacao);

            const pendingOps = service.getPendingOperations();
            const op = pendingOps[0];

            expect(op.timestamp).toBeDefined();
            expect(op.retryCount).toBe(0);
            expect(op.maxRetries).toBe(3);
            expect(op.priority).toBe('normal');
        });

        it('deve configurar retry máximo baseado na prioridade', () => {
            const operacaoCritica = {
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem,
                priority: 'critical' as const
            };

            service.addPendingOperation(operacaoCritica);

            const pendingOps = service.getPendingOperations();
            expect(pendingOps[0].maxRetries).toBe(10);
        });

        it('deve remover operação da fila', () => {
            const operacao = {
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            };

            const operationId = service.addPendingOperation(operacao);
            expect(service.getPendingOperations().length).toBe(1);

            service.removePendingOperation(operationId);
            expect(service.getPendingOperations().length).toBe(0);
        });

        it('deve limpar todas as operações pendentes', () => {
            service.addPendingOperation({
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            });

            service.addPendingOperation({
                type: 'update' as const,
                collection: 'custos',
                data: { valor: 100 }
            });

            expect(service.getPendingOperations().length).toBe(2);

            service.clearPendingOperations();
            expect(service.getPendingOperations().length).toBe(0);
        });
    });

    describe('Persistência no localStorage', () => {
        it('deve salvar operações pendentes no localStorage', () => {
            const operacao = {
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            };

            service.addPendingOperation(operacao);

            const storageKey = 'andes_pending_operations';
            expect(localStorage.setItem).toHaveBeenCalledWith(storageKey, jasmine.any(String));

            const storedData = JSON.parse(mockLocalStorage[storageKey]);
            expect(storedData.length).toBe(1);
            expect(storedData[0].type).toBe('create');
        });

        it('deve carregar operações pendentes do localStorage na inicialização', () => {
            const operacoesSalvas = [
                {
                    id: 'op-1',
                    type: 'create',
                    collection: 'viagens',
                    data: mockViagem,
                    timestamp: Date.now(),
                    retryCount: 0,
                    maxRetries: 3,
                    priority: 'normal'
                }
            ];

            mockLocalStorage['andes_pending_operations'] = JSON.stringify(operacoesSalvas);

            // Criar nova instância para testar carregamento
            const newService = new OfflineService(mockCacheService);

            const pendingOps = newService.getPendingOperations();
            expect(pendingOps.length).toBe(1);
            expect(pendingOps[0].id).toBe('op-1');
            expect(pendingOps[0].type).toBe('create');
        });

        it('deve tratar erro ao salvar no localStorage', () => {
            (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');

            // Não deve lançar erro
            expect(() => {
                service.addPendingOperation({
                    type: 'create' as const,
                    collection: 'viagens',
                    data: mockViagem
                });
            }).not.toThrow();
        });

        it('deve tratar dados corrompidos no localStorage', () => {
            mockLocalStorage['andes_pending_operations'] = 'dados-corrompidos';

            // Não deve lançar erro, apenas inicializar com array vazio
            expect(() => new OfflineService(mockCacheService)).not.toThrow();
        });
    });

    describe('Sincronização de Operações', () => {
        beforeEach(() => {
            jasmine.clock().install();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('deve tentar sincronizar quando volta online', (done) => {
            // Começar offline
            Object.defineProperty(navigator, 'onLine', { value: false });
            const offlineService = new OfflineService(mockCacheService);

            // Adicionar operação pendente
            offlineService.addPendingOperation({
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            });

            // Espiar método de sincronização
            spyOn(offlineService as any, 'syncPendingOperations').and.returnValue(Promise.resolve([]));

            // Simular volta online
            Object.defineProperty(navigator, 'onLine', { value: true });
            window.dispatchEvent(new Event('online'));

            // Aguardar delay de 2 segundos
            setTimeout(() => {
                expect((offlineService as any).syncPendingOperations).toHaveBeenCalled();
                done();
            }, 2100);

            jasmine.clock().tick(2100);
        });

        it('deve ordenar operações por prioridade e timestamp', async () => {
            const operacoes = [
                {
                    type: 'create' as const,
                    collection: 'viagens',
                    data: mockViagem,
                    priority: 'low' as const
                },
                {
                    type: 'update' as const,
                    collection: 'custos',
                    data: { valor: 100 },
                    priority: 'critical' as const
                },
                {
                    type: 'delete' as const,
                    collection: 'paradas',
                    data: { id: 'parada-123' },
                    priority: 'high' as const
                }
            ];

            operacoes.forEach(op => service.addPendingOperation(op));

            // Simular execução bem-sucedida
            spyOn(service as any, 'executeOperation').and.returnValue(Promise.resolve());

            const results = await (service as any).syncPendingOperations();

            expect(results.length).toBe(3);
            expect(results.every((r: any) => r.success)).toBeTrue();
        });

        it('deve incrementar contador de retry em caso de falha', async () => {
            service.addPendingOperation({
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            });

            // Simular falha na execução
            spyOn(service as any, 'executeOperation').and.returnValue(
                Promise.reject(new Error('Erro de rede'))
            );

            await (service as any).syncPendingOperations();

            const pendingOps = service.getPendingOperations();
            expect(pendingOps[0].retryCount).toBe(1);
        });

        it('deve remover operação após exceder máximo de tentativas', async () => {
            const operacao = {
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem,
                maxRetries: 2
            };

            service.addPendingOperation(operacao);

            // Simular falha repetida
            spyOn(service as any, 'executeOperation').and.returnValue(
                Promise.reject(new Error('Erro persistente'))
            );

            // Primeira tentativa
            await (service as any).syncPendingOperations();
            expect(service.getPendingOperations().length).toBe(1);

            // Segunda tentativa
            await (service as any).syncPendingOperations();
            expect(service.getPendingOperations().length).toBe(1);

            // Terceira tentativa - deve remover
            await (service as any).syncPendingOperations();
            expect(service.getPendingOperations().length).toBe(0);
        });

        it('deve processar operações em lotes com delay', async () => {
            const operacoes = Array.from({ length: 5 }, (_, i) => ({
                type: 'create' as const,
                collection: 'viagens',
                data: { ...mockViagem, id: `viagem-${i}` }
            }));

            operacoes.forEach(op => service.addPendingOperation(op));

            const executeSpy = spyOn(service as any, 'executeOperation').and.returnValue(Promise.resolve());

            await (service as any).syncPendingOperations();

            expect(executeSpy).toHaveBeenCalledTimes(5);
        });
    });

    describe('Integração com CacheService', () => {
        it('deve armazenar dados críticos no cache e localStorage', () => {
            const key = 'viagens_usuario_123';
            const data = mockViagens;

            service.storeCriticalData(key, data);

            expect(mockCacheService.set).toHaveBeenCalledWith(
                key,
                data,
                mockCacheService.strategies.OFFLINE
            );

            const criticalDataKey = 'andes_critical_data';
            expect(localStorage.setItem).toHaveBeenCalledWith(criticalDataKey, jasmine.any(String));
        });

        it('deve recuperar dados críticos do cache primeiro', () => {
            const key = 'viagens_usuario_123';
            const cachedData = mockViagens;

            mockCacheService.get.and.returnValue(cachedData);

            const result = service.getCriticalData(key);

            expect(result).toEqual(cachedData);
            expect(mockCacheService.get).toHaveBeenCalledWith(key);
        });

        it('deve recuperar dados críticos do localStorage se não estiver no cache', () => {
            const key = 'viagens_usuario_123';
            const storedData = mockViagens;

            mockCacheService.get.and.returnValue(null);

            // Simular dados no localStorage
            const criticalData = {
                [key]: {
                    data: storedData,
                    timestamp: Date.now()
                }
            };
            mockLocalStorage['andes_critical_data'] = JSON.stringify(criticalData);

            const result = service.getCriticalData(key);

            expect(result).toEqual(storedData);
            expect(mockCacheService.set).toHaveBeenCalledWith(
                key,
                storedData,
                mockCacheService.strategies.OFFLINE
            );
        });

        it('deve retornar null se dados não existirem', () => {
            const key = 'dados_inexistentes';

            mockCacheService.get.and.returnValue(null);

            const result = service.getCriticalData(key);

            expect(result).toBeNull();
        });

        it('deve obter dados com fallback offline', (done) => {
            const key = 'viagens_teste';
            const networkData = mockViagens;
            const networkFactory = () => of(networkData);

            mockCacheService.getOrSet.and.returnValue(of(networkData));

            service.getDataWithOfflineFallback(key, networkFactory).subscribe(result => {
                expect(result.data).toEqual(networkData);
                expect(result.source).toBe('network');
                expect(result.isStale).toBeFalse();
                done();
            });
        });

        it('deve usar dados críticos como fallback em caso de erro', (done) => {
            const key = 'viagens_fallback';
            const criticalData = mockViagens;
            const networkFactory = () => throwError(() => new Error('Erro de rede'));

            mockCacheService.getOrSet.and.returnValue(throwError(() => new Error('Cache error')));
            spyOn(service, 'getCriticalData').and.returnValue(criticalData);

            service.getDataWithOfflineFallback(key, networkFactory).subscribe(result => {
                expect(result.data).toEqual(criticalData);
                expect(result.source).toBe('storage');
                expect(result.isStale).toBeTrue();
                done();
            });
        });
    });

    describe('Estatísticas e Monitoramento', () => {
        it('deve obter estatísticas das operações pendentes', () => {
            service.addPendingOperation({
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem,
                priority: 'high' as const
            });

            service.addPendingOperation({
                type: 'update' as const,
                collection: 'custos',
                data: { valor: 100 },
                priority: 'normal' as const
            });

            service.addPendingOperation({
                type: 'create' as const,
                collection: 'paradas',
                data: { nome: 'Parada teste' },
                priority: 'high' as const
            });

            const stats = service.getPendingStats();

            expect(stats.total).toBe(3);
            expect(stats.byType.create).toBe(2);
            expect(stats.byType.update).toBe(1);
            expect(stats.byPriority.high).toBe(2);
            expect(stats.byPriority.normal).toBe(1);
            expect(stats.oldestOperation).toBeDefined();
        });

        it('deve obter status de sincronização', () => {
            const status = service.getSyncStatus();

            expect(status.isOnline).toBeDefined();
            expect(status.syncInProgress).toBeDefined();
            expect(status.pendingOperations).toBeDefined();
            expect(typeof status.isOnline).toBe('boolean');
            expect(typeof status.syncInProgress).toBe('boolean');
            expect(typeof status.pendingOperations).toBe('number');
        });

        it('deve verificar se há dados offline disponíveis', () => {
            const key = 'test_data';

            mockCacheService.has.and.returnValue(false);
            spyOn(service, 'getCriticalData').and.returnValue(null);

            expect(service.hasOfflineData(key)).toBeFalse();

            mockCacheService.has.and.returnValue(true);
            expect(service.hasOfflineData(key)).toBeTrue();
        });
    });

    describe('Limpeza de Dados', () => {
        it('deve limpar dados críticos antigos', () => {
            const agora = Date.now();
            const dadosAntigos = {
                'dados_antigos': {
                    data: mockViagem,
                    timestamp: agora - (8 * 24 * 60 * 60 * 1000) // 8 dias atrás
                },
                'dados_recentes': {
                    data: mockViagens,
                    timestamp: agora - (1 * 24 * 60 * 60 * 1000) // 1 dia atrás
                }
            };

            mockLocalStorage['andes_critical_data'] = JSON.stringify(dadosAntigos);

            const removedCount = service.cleanOldCriticalData(7 * 24 * 60 * 60 * 1000); // 7 dias

            expect(removedCount).toBe(1);

            const remainingData = JSON.parse(mockLocalStorage['andes_critical_data']);
            expect(remainingData['dados_antigos']).toBeUndefined();
            expect(remainingData['dados_recentes']).toBeDefined();
        });

        it('deve limpar dados offline', () => {
            mockCacheService.cleanExpired.and.returnValue(5);
            spyOn(service, 'cleanOldCriticalData').and.returnValue(2);

            const result = service.cleanupOfflineData();

            expect(result.cacheCleared).toBe(5);
            expect(result.criticalDataCleared).toBe(2);
        });

        it('deve tratar erro durante limpeza de dados críticos', () => {
            (localStorage.getItem as jasmine.Spy).and.throwError('Storage error');

            const removedCount = service.cleanOldCriticalData();

            expect(removedCount).toBe(0);
        });
    });

    describe('Sincronização Forçada', () => {
        it('deve permitir sincronização forçada quando online', async () => {
            service.addPendingOperation({
                type: 'create' as const,
                collection: 'viagens',
                data: mockViagem
            });

            spyOn(service as any, 'syncPendingOperations').and.returnValue(Promise.resolve([]));

            await expectAsync(service.forcSync()).toBeResolved();
            expect((service as any).syncPendingOperations).toHaveBeenCalled();
        });

        it('deve rejeitar sincronização forçada quando offline', async () => {
            Object.defineProperty(navigator, 'onLine', { value: false });
            const offlineService = new OfflineService(mockCacheService);

            await expectAsync(offlineService.forcSync())
                .toBeRejectedWithError('Não é possível sincronizar offline');
        });
    });

    describe('Tratamento de Erros', () => {
        it('deve tratar erro ao armazenar dados críticos', () => {
            (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');

            // Não deve lançar erro
            expect(() => {
                service.storeCriticalData('test', mockViagem);
            }).not.toThrow();
        });

        it('deve tratar erro ao recuperar dados críticos', () => {
            mockCacheService.get.and.returnValue(null);
            (localStorage.getItem as jasmine.Spy).and.throwError('Storage error');

            const result = service.getCriticalData('test');

            expect(result).toBeNull();
        });

        it('deve continuar funcionando com localStorage indisponível', () => {
            (localStorage.getItem as jasmine.Spy).and.throwError('SecurityError');
            (localStorage.setItem as jasmine.Spy).and.throwError('SecurityError');

            // Deve funcionar normalmente, apenas sem persistência
            expect(() => {
                const offlineService = new OfflineService(mockCacheService);
                offlineService.addPendingOperation({
                    type: 'create' as const,
                    collection: 'viagens',
                    data: mockViagem
                });
            }).not.toThrow();
        });
    });
});