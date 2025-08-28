/**
 * Testes de Integração - StorageService
 * 
 * Testa a integração do StorageService com localStorage/sessionStorage,
 * incluindo operações de armazenamento, cache e gerenciamento de dados offline.
 */

import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';
import { MockDataFactory } from '../../testing/test-utils';

describe('StorageService - Testes de Integração', () => {
    let service: StorageService;
    let mockLocalStorage: any;
    let mockSessionStorage: any;

    const mockData = {
        viagem: MockDataFactory.createViagem(),
        usuario: MockDataFactory.createUsuario(),
        configuracoes: {
            tema: 'dark',
            idioma: 'pt-BR',
            notificacoes: true
        }
    };

    beforeEach(() => {
        // Mock do localStorage
        mockLocalStorage = {
            getItem: jasmine.createSpy('getItem'),
            setItem: jasmine.createSpy('setItem'),
            removeItem: jasmine.createSpy('removeItem'),
            clear: jasmine.createSpy('clear'),
            length: 0,
            key: jasmine.createSpy('key')
        };

        // Mock do sessionStorage
        mockSessionStorage = {
            getItem: jasmine.createSpy('getItem'),
            setItem: jasmine.createSpy('setItem'),
            removeItem: jasmine.createSpy('removeItem'),
            clear: jasmine.createSpy('clear'),
            length: 0,
            key: jasmine.createSpy('key')
        };

        // Substituir localStorage e sessionStorage globais
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });

        Object.defineProperty(window, 'sessionStorage', {
            value: mockSessionStorage,
            writable: true
        });

        TestBed.configureTestingModule({
            providers: [StorageService]
        });

        service = TestBed.inject(StorageService);
    });

    describe('Operações Básicas de Armazenamento', () => {
        it('deve armazenar dados no localStorage por padrão', () => {
            const key = 'test-key';
            const value = mockData.viagem;

            service.setItem(key, value);

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                key,
                JSON.stringify(value)
            );
        });

        it('deve recuperar dados do localStorage', () => {
            const key = 'test-key';
            const value = mockData.viagem;
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(value));

            const result = service.getItem(key);

            expect(result).toEqual(value);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(key);
        });

        it('deve remover dados do localStorage', () => {
            const key = 'test-key';

            service.removeItem(key);

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key);
        });

        it('deve limpar todo o localStorage', () => {
            service.clear();

            expect(mockLocalStorage.clear).toHaveBeenCalled();
        });

        it('deve usar sessionStorage quando especificado', () => {
            const key = 'session-key';
            const value = mockData.usuario;

            service.setItem(key, value, 'session');

            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                key,
                JSON.stringify(value)
            );
        });

        it('deve recuperar dados do sessionStorage', () => {
            const key = 'session-key';
            const value = mockData.usuario;
            mockSessionStorage.getItem.and.returnValue(JSON.stringify(value));

            const result = service.getItem(key, 'session');

            expect(result).toEqual(value);
            expect(mockSessionStorage.getItem).toHaveBeenCalledWith(key);
        });
    });

    describe('Tratamento de Erros e Edge Cases', () => {
        it('deve retornar null para chave inexistente', () => {
            mockLocalStorage.getItem.and.returnValue(null);

            const result = service.getItem('chave-inexistente');

            expect(result).toBeNull();
        });

        it('deve tratar JSON inválido graciosamente', () => {
            mockLocalStorage.getItem.and.returnValue('json-invalido{');

            const result = service.getItem('json-invalido');

            expect(result).toBeNull();
        });

        it('deve tratar erro de quota excedida no localStorage', () => {
            const erro = new DOMException('QuotaExceededError');
            mockLocalStorage.setItem.and.throwError(erro);

            spyOn(console, 'error');

            service.setItem('test-key', mockData.viagem);

            expect(console.error).toHaveBeenCalledWith(
                'Erro ao salvar no localStorage:',
                erro
            );
        });

        it('deve tratar localStorage indisponível', () => {
            // Simular localStorage indisponível
            Object.defineProperty(window, 'localStorage', {
                value: null,
                writable: true
            });

            spyOn(console, 'warn');

            const result = service.getItem('test-key');

            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalledWith('localStorage não está disponível');
        });

        it('deve tratar sessionStorage indisponível', () => {
            // Simular sessionStorage indisponível
            Object.defineProperty(window, 'sessionStorage', {
                value: null,
                writable: true
            });

            spyOn(console, 'warn');

            const result = service.getItem('test-key', 'session');

            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalledWith('sessionStorage não está disponível');
        });
    });

    describe('Gerenciamento de Dados Offline', () => {
        it('deve armazenar dados offline por coleção', () => {
            const collection = 'viagens';
            const documentId = 'viagem-123';
            const data = mockData.viagem;

            service.setOfflineData(collection, documentId, data);

            const expectedKey = `offline_${collection}_${documentId}`;
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                expectedKey,
                JSON.stringify(data)
            );
        });

        it('deve recuperar dados offline por coleção', () => {
            const collection = 'viagens';
            const documentId = 'viagem-123';
            const data = mockData.viagem;
            const expectedKey = `offline_${collection}_${documentId}`;

            mockLocalStorage.getItem.and.returnValue(JSON.stringify(data));

            const result = service.getOfflineData(collection, documentId);

            expect(result).toEqual(data);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(expectedKey);
        });

        it('deve listar todos os dados offline de uma coleção', () => {
            const collection = 'viagens';
            const viagens = MockDataFactory.createViagens(3);

            // Simular múltiplas chaves no localStorage
            mockLocalStorage.length = 5;
            mockLocalStorage.key.and.callFake((index: number) => {
                const keys = [
                    `offline_${collection}_viagem-1`,
                    `offline_${collection}_viagem-2`,
                    `offline_${collection}_viagem-3`,
                    'other_key_1',
                    'other_key_2'
                ];
                return keys[index];
            });

            mockLocalStorage.getItem.and.callFake((key: string) => {
                if (key.startsWith(`offline_${collection}_`)) {
                    const index = parseInt(key.split('_')[2].split('-')[1]) - 1;
                    return JSON.stringify(viagens[index]);
                }
                return null;
            });

            const result = service.getOfflineData(collection);

            expect(result).toEqual(viagens);
            expect(mockLocalStorage.key).toHaveBeenCalledTimes(5);
        });

        it('deve remover dados offline específicos', () => {
            const collection = 'viagens';
            const documentId = 'viagem-123';

            service.removeOfflineData(collection, documentId);

            const expectedKey = `offline_${collection}_${documentId}`;
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(expectedKey);
        });

        it('deve limpar todos os dados offline de uma coleção', () => {
            const collection = 'viagens';

            // Simular chaves no localStorage
            mockLocalStorage.length = 3;
            mockLocalStorage.key.and.callFake((index: number) => {
                const keys = [
                    `offline_${collection}_viagem-1`,
                    `offline_${collection}_viagem-2`,
                    'other_key'
                ];
                return keys[index];
            });

            service.clearOfflineData(collection);

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`offline_${collection}_viagem-1`);
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`offline_${collection}_viagem-2`);
            expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other_key');
        });
    });

    describe('Gerenciamento de Operações Pendentes', () => {
        const mockOperation = {
            id: 'op-123',
            type: 'create',
            collection: 'viagens',
            data: mockData.viagem,
            timestamp: new Date(),
            retries: 0
        };

        it('deve adicionar operação pendente', () => {
            mockLocalStorage.getItem.and.returnValue('[]'); // Lista vazia inicial

            service.addPendingOperation(mockOperation);

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'pending_operations',
                JSON.stringify([mockOperation])
            );
        });

        it('deve recuperar todas as operações pendentes', () => {
            const operations = [mockOperation];
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(operations));

            const result = service.getPendingOperations();

            expect(result).toEqual(operations);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('pending_operations');
        });

        it('deve remover operação pendente específica', () => {
            const operations = [
                mockOperation,
                { ...mockOperation, id: 'op-456' }
            ];
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(operations));

            service.removePendingOperation('op-123');

            const expectedOperations = [{ ...mockOperation, id: 'op-456' }];
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'pending_operations',
                JSON.stringify(expectedOperations)
            );
        });

        it('deve limpar todas as operações pendentes', () => {
            service.clearPendingOperations();

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'pending_operations',
                JSON.stringify([])
            );
        });

        it('deve atualizar operação pendente existente', () => {
            const operations = [mockOperation];
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(operations));

            const updatedOperation = { ...mockOperation, retries: 1 };
            service.updatePendingOperation('op-123', updatedOperation);

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'pending_operations',
                JSON.stringify([updatedOperation])
            );
        });
    });

    describe('Gerenciamento de Conflitos', () => {
        const mockConflict = {
            id: 'conflict-123',
            collectionName: 'viagens',
            documentId: 'viagem-123',
            localData: mockData.viagem,
            remoteData: { ...mockData.viagem, nome: 'Viagem Remota' },
            timestamp: new Date(),
            resolved: false
        };

        it('deve adicionar conflito', () => {
            mockLocalStorage.getItem.and.returnValue('[]');

            service.addConflict(mockConflict);

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'conflicts',
                JSON.stringify([mockConflict])
            );
        });

        it('deve recuperar todos os conflitos', () => {
            const conflicts = [mockConflict];
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(conflicts));

            const result = service.getConflicts();

            expect(result).toEqual(conflicts);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('conflicts');
        });

        it('deve remover conflito específico', () => {
            const conflicts = [
                mockConflict,
                { ...mockConflict, id: 'conflict-456' }
            ];
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(conflicts));

            service.removeConflict('conflict-123');

            const expectedConflicts = [{ ...mockConflict, id: 'conflict-456' }];
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'conflicts',
                JSON.stringify(expectedConflicts)
            );
        });

        it('deve marcar conflito como resolvido', () => {
            const conflicts = [mockConflict];
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(conflicts));

            service.markConflictResolved('conflict-123');

            const expectedConflicts = [{ ...mockConflict, resolved: true }];
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'conflicts',
                JSON.stringify(expectedConflicts)
            );
        });
    });

    describe('Cache com TTL', () => {
        it('deve armazenar dados com TTL', () => {
            const key = 'cache-key';
            const value = mockData.configuracoes;
            const ttl = 60000; // 1 minuto

            spyOn(Date, 'now').and.returnValue(1640995200000);

            service.setCacheItem(key, value, ttl);

            const expectedCacheData = {
                value,
                expiry: 1640995200000 + ttl
            };

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                `cache_${key}`,
                JSON.stringify(expectedCacheData)
            );
        });

        it('deve recuperar dados válidos do cache', () => {
            const key = 'cache-key';
            const value = mockData.configuracoes;
            const currentTime = 1640995200000;
            const expiry = currentTime + 60000;

            const cacheData = { value, expiry };
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(cacheData));
            spyOn(Date, 'now').and.returnValue(currentTime);

            const result = service.getCacheItem(key);

            expect(result).toEqual(value);
        });

        it('deve retornar null para dados expirados do cache', () => {
            const key = 'cache-key';
            const value = mockData.configuracoes;
            const expiry = 1640995200000;
            const currentTime = expiry + 1000; // 1 segundo após expiração

            const cacheData = { value, expiry };
            mockLocalStorage.getItem.and.returnValue(JSON.stringify(cacheData));
            spyOn(Date, 'now').and.returnValue(currentTime);

            const result = service.getCacheItem(key);

            expect(result).toBeNull();
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`cache_${key}`);
        });

        it('deve limpar cache expirado automaticamente', () => {
            const currentTime = 1640995200000;
            spyOn(Date, 'now').and.returnValue(currentTime);

            // Simular múltiplas chaves de cache
            mockLocalStorage.length = 4;
            mockLocalStorage.key.and.callFake((index: number) => {
                const keys = [
                    'cache_valid_1',
                    'cache_expired_1',
                    'cache_valid_2',
                    'other_key'
                ];
                return keys[index];
            });

            mockLocalStorage.getItem.and.callFake((key: string) => {
                if (key === 'cache_valid_1') {
                    return JSON.stringify({ value: 'data1', expiry: currentTime + 60000 });
                }
                if (key === 'cache_expired_1') {
                    return JSON.stringify({ value: 'data2', expiry: currentTime - 60000 });
                }
                if (key === 'cache_valid_2') {
                    return JSON.stringify({ value: 'data3', expiry: currentTime + 120000 });
                }
                return null;
            });

            service.clearExpiredCache();

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cache_expired_1');
            expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('cache_valid_1');
            expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('cache_valid_2');
        });
    });

    describe('Utilitários e Helpers', () => {
        it('deve verificar se chave existe', () => {
            mockLocalStorage.getItem.and.returnValue('some-value');

            const exists = service.hasItem('existing-key');

            expect(exists).toBe(true);
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('existing-key');
        });

        it('deve retornar false para chave inexistente', () => {
            mockLocalStorage.getItem.and.returnValue(null);

            const exists = service.hasItem('non-existing-key');

            expect(exists).toBe(false);
        });

        it('deve obter tamanho do storage usado', () => {
            mockLocalStorage.length = 5;

            const size = service.getStorageSize();

            expect(size).toBe(5);
        });

        it('deve obter todas as chaves do storage', () => {
            const keys = ['key1', 'key2', 'key3'];
            mockLocalStorage.length = keys.length;
            mockLocalStorage.key.and.callFake((index: number) => keys[index]);

            const result = service.getAllKeys();

            expect(result).toEqual(keys);
        });

        it('deve obter estatísticas do storage', () => {
            mockLocalStorage.length = 10;
            mockLocalStorage.key.and.callFake((index: number) => {
                const keys = [
                    'offline_viagens_1', 'offline_viagens_2',
                    'cache_data_1', 'cache_data_2',
                    'pending_operations',
                    'conflicts',
                    'user_preferences',
                    'app_settings',
                    'temp_data_1', 'temp_data_2'
                ];
                return keys[index];
            });

            const stats = service.getStorageStats();

            expect(stats.totalItems).toBe(10);
            expect(stats.offlineData).toBe(2);
            expect(stats.cacheItems).toBe(2);
            expect(stats.pendingOperations).toBe(1);
            expect(stats.conflicts).toBe(1);
            expect(stats.otherItems).toBe(4);
        });
    });

    describe('Performance e Otimização', () => {
        it('deve processar grandes volumes de dados rapidamente', () => {
            const largeData = Array.from({ length: 1000 }, (_, i) => ({
                id: `item-${i}`,
                data: `data-${i}`.repeat(100)
            }));

            const inicio = performance.now();
            
            largeData.forEach((item, index) => {
                service.setItem(`large-item-${index}`, item);
            });
            
            const fim = performance.now();
            
            // Deve processar rapidamente
            expect(fim - inicio).toBeLessThan(1000);
        });

        it('deve otimizar operações de limpeza em lote', () => {
            // Simular muitas chaves de cache expirado
            const muitasChaves = Array.from({ length: 100 }, (_, i) => `cache_expired_${i}`);
            
            mockLocalStorage.length = muitasChaves.length;
            mockLocalStorage.key.and.callFake((index: number) => muitasChaves[index]);
            mockLocalStorage.getItem.and.returnValue(JSON.stringify({
                value: 'data',
                expiry: Date.now() - 60000 // Expirado
            }));

            const inicio = performance.now();
            service.clearExpiredCache();
            const fim = performance.now();

            expect(fim - inicio).toBeLessThan(500);
            expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(100);
        });
    });

    describe('Compatibilidade e Robustez', () => {
        it('deve funcionar em modo privado/incógnito', () => {
            // Simular erro de quota em modo privado
            mockLocalStorage.setItem.and.throwError(new DOMException('QuotaExceededError'));

            spyOn(console, 'error');

            // Não deve lançar erro
            expect(() => service.setItem('test', 'data')).not.toThrow();
            expect(console.error).toHaveBeenCalled();
        });

        it('deve lidar com dados corrompidos no storage', () => {
            mockLocalStorage.getItem.and.returnValue('dados-corrompidos-não-json');

            const result = service.getItem('corrupted-key');

            expect(result).toBeNull();
        });

        it('deve manter funcionalidade mesmo com storage desabilitado', () => {
            // Simular storage completamente indisponível
            Object.defineProperty(window, 'localStorage', {
                value: undefined,
                writable: true
            });

            // Não deve lançar erro
            expect(() => {
                service.setItem('test', 'data');
                service.getItem('test');
                service.removeItem('test');
            }).not.toThrow();
        });
    });
});