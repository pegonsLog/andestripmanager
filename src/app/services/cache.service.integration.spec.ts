/**
 * Testes de Integração - CacheService
 * 
 * Testa a integração do CacheService com localStorage, estratégias de cache,
 * sincronização offline e gerenciamento de memória.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CacheService, CachePriority } from '../core/services/cache.service';
import { MockDataFactory } from '../testing/test-utils';

describe('CacheService - Testes de Integração', () => {
    let service: CacheService;
    let mockLocalStorage: { [key: string]: string };

    const mockViagem = MockDataFactory.createViagem();
    const mockViagens = MockDataFactory.createViagens(5);

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

        spyOn(localStorage, 'clear').and.callFake(() => {
            mockLocalStorage = {};
        });

        Object.defineProperty(localStorage, 'length', {
            get: () => Object.keys(mockLocalStorage).length
        });

        // Mock do Object.keys para localStorage
        spyOn(Object, 'keys').and.callFake((obj: any) => {
            if (obj === localStorage) {
                return Object.keys(mockLocalStorage);
            }
            return Object.keys(obj);
        });

        TestBed.configureTestingModule({
            providers: [CacheService]
        });

        service = TestBed.inject(CacheService);
    });

    describe('Integração com localStorage', () => {
        it('deve persistir dados no localStorage com estratégia persistente', () => {
            const key = 'test-persistent';
            const data = mockViagem;

            service.set(key, data, service.strategies.PERSISTENT);

            const storageKey = `andes_cache_${key}`;
            expect(localStorage.setItem).toHaveBeenCalledWith(storageKey, jasmine.any(String));

            const storedData = JSON.parse(mockLocalStorage[storageKey]);
            expect(storedData.data).toEqual(data);
            expect(storedData.priority).toBe(CachePriority.CRITICAL);
        });

        it('deve carregar dados do localStorage na inicialização', () => {
            const key = 'test-load';
            const data = mockViagem;
            const storageKey = `andes_cache_${key}`;

            // Simular dados já existentes no localStorage
            const cacheItem = {
                data,
                timestamp: Date.now(),
                ttl: 24 * 60 * 60 * 1000, // 24 horas
                priority: CachePriority.HIGH
            };

            mockLocalStorage[storageKey] = JSON.stringify(cacheItem);

            // Criar nova instância do serviço para testar carregamento
            const newService = new CacheService();

            const retrievedData = newService.get(key);
            expect(retrievedData).toEqual(data);
        });

        it('deve remover dados expirados do localStorage na inicialização', () => {
            const key = 'test-expired';
            const data = mockViagem;
            const storageKey = `andes_cache_${key}`;

            // Simular dados expirados no localStorage
            const expiredItem = {
                data,
                timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 horas atrás
                ttl: 24 * 60 * 60 * 1000, // TTL de 24 horas
                priority: CachePriority.HIGH
            };

            mockLocalStorage[storageKey] = JSON.stringify(expiredItem);

            // Criar nova instância do serviço para testar limpeza
            const newService = new CacheService();

            const retrievedData = newService.get(key);
            expect(retrievedData).toBeNull();
            expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey);
        });

        it('deve tratar erro ao carregar dados corrompidos do localStorage', () => {
            const key = 'test-corrupted';
            const storageKey = `andes_cache_${key}`;

            // Simular dados corrompidos no localStorage
            mockLocalStorage[storageKey] = 'dados-corrompidos-nao-json';

            // Não deve lançar erro, apenas ignorar dados corrompidos
            expect(() => new CacheService()).not.toThrow();
        });
    });

    describe('Estratégias de Cache', () => {
        it('deve aplicar estratégia QUICK corretamente', () => {
            const key = 'test-quick';
            const data = mockViagem;

            service.set(key, data, service.strategies.QUICK);

            // Verificar TTL de 1 minuto
            const cachedItem = (service as any).memoryCache.get(key);
            expect(cachedItem.ttl).toBe(1 * 60 * 1000);
            expect(cachedItem.priority).toBe(CachePriority.LOW);

            // Não deve persistir no localStorage
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });

        it('deve aplicar estratégia NORMAL corretamente', () => {
            const key = 'test-normal';
            const data = mockViagem;

            service.set(key, data, service.strategies.NORMAL);

            const cachedItem = (service as any).memoryCache.get(key);
            expect(cachedItem.ttl).toBe(5 * 60 * 1000); // 5 minutos
            expect(cachedItem.priority).toBe(CachePriority.NORMAL);
        });

        it('deve aplicar estratégia LONG corretamente', () => {
            const key = 'test-long';
            const data = mockViagem;

            service.set(key, data, service.strategies.LONG);

            const cachedItem = (service as any).memoryCache.get(key);
            expect(cachedItem.ttl).toBe(30 * 60 * 1000); // 30 minutos
            expect(cachedItem.priority).toBe(CachePriority.HIGH);
        });

        it('deve aplicar estratégia OFFLINE corretamente', () => {
            const key = 'test-offline';
            const data = mockViagens;

            service.set(key, data, service.strategies.OFFLINE);

            const cachedItem = (service as any).memoryCache.get(key);
            expect(cachedItem.ttl).toBe(7 * 24 * 60 * 60 * 1000); // 7 dias
            expect(cachedItem.priority).toBe(CachePriority.CRITICAL);

            // Deve persistir no localStorage
            expect(localStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('Gerenciamento de Memória', () => {
        it('deve remover itens de baixa prioridade quando limite de memória é atingido', () => {
            // Simular dados grandes para atingir limite de memória
            const largeData = new Array(1000).fill(mockViagem);

            // Adicionar itens de diferentes prioridades
            service.set('low-priority-1', largeData, service.strategies.QUICK);
            service.set('normal-priority', largeData, service.strategies.NORMAL);
            service.set('high-priority', largeData, service.strategies.LONG);
            service.set('critical-priority', largeData, service.strategies.PERSISTENT);

            // Forçar limpeza de memória
            (service as any).enforceMemoryLimit();

            // Itens de baixa prioridade devem ser removidos primeiro
            expect(service.has('low-priority-1')).toBeFalse();
            expect(service.has('critical-priority')).toBeTrue();
        });

        it('deve estimar tamanho dos dados corretamente', () => {
            const smallData = { id: '1', name: 'test' };
            const largeData = mockViagens;

            service.set('small', smallData);
            service.set('large', largeData);

            const smallItem = (service as any).memoryCache.get('small');
            const largeItem = (service as any).memoryCache.get('large');

            expect(largeItem.size).toBeGreaterThan(smallItem.size);
        });

        it('deve obter estatísticas de cache corretamente', () => {
            service.set('item1', mockViagem, service.strategies.NORMAL);
            service.set('item2', mockViagens, service.strategies.PERSISTENT);

            const stats = service.getStats();

            expect(stats.memoryEntries).toBe(2);
            expect(stats.totalSize).toBeGreaterThan(0);
            expect(stats.storageEntries).toBe(1); // Apenas item persistente
        });
    });

    describe('Limpeza Automática', () => {
        beforeEach(() => {
            jasmine.clock().install();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('deve limpar itens expirados automaticamente', () => {
            const key = 'test-expiry';
            const data = mockViagem;

            // Adicionar item com TTL curto
            service.setWithTtl(key, data, 1000); // 1 segundo

            expect(service.has(key)).toBeTrue();

            // Avançar tempo para expirar o item
            jasmine.clock().tick(2000);

            // Simular limpeza automática
            const removedCount = service.cleanExpired();

            expect(removedCount).toBe(1);
            expect(service.has(key)).toBeFalse();
        });
    });

    describe('Funcionalidade getOrSet', () => {
        it('deve retornar dados do cache se disponíveis', (done) => {
            const key = 'test-get-or-set';
            const cachedData = mockViagem;
            const factory = jasmine.createSpy('factory').and.returnValue(of(mockViagens));

            // Pré-popular cache
            service.set(key, cachedData);

            service.getOrSet(key, factory).subscribe(data => {
                expect(data).toEqual(cachedData);
                expect(factory).not.toHaveBeenCalled();
                done();
            });
        });

        it('deve chamar factory e cachear resultado se não estiver em cache', (done) => {
            const key = 'test-factory';
            const factoryData = mockViagens;
            const factory = jasmine.createSpy('factory').and.returnValue(of(factoryData));

            service.getOrSet(key, factory).subscribe(data => {
                expect(data).toEqual(factoryData);
                expect(factory).toHaveBeenCalled();
                expect(service.get(key)).toEqual(factoryData);
                done();
            });
        });

        it('deve tratar erro do factory corretamente', (done) => {
            const key = 'test-factory-error';
            const error = new Error('Factory error');
            const factory = jasmine.createSpy('factory').and.returnValue(throwError(() => error));

            service.getOrSet(key, factory).subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err).toBe(error);
                    expect(service.has(key)).toBeFalse();
                    done();
                }
            });
        });
    });

    describe('Invalidação de Cache', () => {
        it('deve invalidar cache por padrão de chave', () => {
            service.set('viagem_123', mockViagem);
            service.set('viagem_456', mockViagem);
            service.set('usuario_123', MockDataFactory.createUsuario());

            const invalidatedCount = service.invalidatePattern('viagem_.*');

            expect(invalidatedCount).toBe(2);
            expect(service.has('viagem_123')).toBeFalse();
            expect(service.has('viagem_456')).toBeFalse();
            expect(service.has('usuario_123')).toBeTrue();
        });

        it('deve limpar todo o cache', () => {
            service.set('item1', mockViagem);
            service.set('item2', mockViagens, service.strategies.PERSISTENT);

            expect(service.size()).toBe(2);

            service.clear();

            expect(service.size()).toBe(0);
            expect(localStorage.clear).toHaveBeenCalled();
        });
    });

    describe('Pré-carregamento de Dados', () => {
        it('deve pré-carregar dados críticos com estratégia persistente', (done) => {
            const key = 'critical-data';
            const criticalData = mockViagens;
            const factory = jasmine.createSpy('factory').and.returnValue(of(criticalData));

            service.preload(key, factory).subscribe(data => {
                expect(data).toEqual(criticalData);

                const cachedItem = (service as any).memoryCache.get(key);
                expect(cachedItem.priority).toBe(CachePriority.CRITICAL);
                expect(localStorage.setItem).toHaveBeenCalled();
                done();
            });
        });
    });

    describe('Tratamento de Erros do localStorage', () => {
        it('deve tratar erro de quota excedida no localStorage', () => {
            // Simular erro de quota excedida
            (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');

            // Não deve lançar erro, apenas falhar silenciosamente
            expect(() => {
                service.set('test', mockViagem, service.strategies.PERSISTENT);
            }).not.toThrow();
        });

        it('deve continuar funcionando mesmo com localStorage indisponível', () => {
            // Simular localStorage indisponível
            (localStorage.getItem as jasmine.Spy).and.throwError('SecurityError');
            (localStorage.setItem as jasmine.Spy).and.throwError('SecurityError');

            // Cache em memória deve continuar funcionando
            service.set('test', mockViagem);
            expect(service.get('test')).toEqual(mockViagem);
        });
    });

    describe('Funcionalidades Avançadas', () => {
        it('deve listar todas as chaves do cache', () => {
            service.set('key1', mockViagem);
            service.set('key2', mockViagens);

            const keys = service.keys();

            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys.length).toBe(2);
        });

        it('deve verificar existência de chave corretamente', () => {
            service.set('existing-key', mockViagem);

            expect(service.has('existing-key')).toBeTrue();
            expect(service.has('non-existing-key')).toBeFalse();
        });

        it('deve deletar item específico do cache', () => {
            service.set('to-delete', mockViagem, service.strategies.PERSISTENT);

            expect(service.has('to-delete')).toBeTrue();

            const deleted = service.delete('to-delete');

            expect(deleted).toBeTrue();
            expect(service.has('to-delete')).toBeFalse();
            expect(localStorage.removeItem).toHaveBeenCalled();
        });
    });
});