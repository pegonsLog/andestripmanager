/**
 * Testes de Integração - DiarioBordoService
 * 
 * Testa a integração do DiarioBordoService com Firestore, Firebase Storage, AuthService,
 * incluindo operações CRUD, upload de fotos e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { of, throwError } from 'rxjs';

import { DiarioBordoService } from './diario-bordo.service';
import { AuthService } from '../core/services/auth.service';
import { 
    DiarioBordo, 
    DiarioBordoForm, 
    DiarioBordoFiltros 
} from '../models/diario-bordo.interface';
import { Usuario } from '../models';
import { MockDataFactory } from '../testing/test-utils';

describe('DiarioBordoService - Testes de Integração', () => {
    let service: DiarioBordoService;
    let mockFirestore: any;
    let mockStorage: any;
    let mockAuthService: jasmine.SpyObj<AuthService>;

    const mockUsuario: Usuario = MockDataFactory.createUsuario();
    const mockDiarioBordo: DiarioBordo = MockDataFactory.createDiarioBordo();
    const mockDiarioForm: DiarioBordoForm = {
        titulo: 'Entrada de Teste',
        conteudo: 'Conteúdo da entrada de teste',
        publico: false,
        tags: ['teste', 'viagem'],
        fotos: []
    };

    const mockFile = new File(['foto content'], 'foto.jpg', { type: 'image/jpeg' });

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-diario-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockDiarioBordo.id,
                data: () => mockDiarioBordo
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: [{
                    id: mockDiarioBordo.id,
                    data: () => mockDiarioBordo
                }]
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({}),
            serverTimestamp: jasmine.createSpy('serverTimestamp').and.returnValue({})
        };

        // Mock do Firebase Storage
        mockStorage = {
            ref: jasmine.createSpy('ref').and.returnValue({}),
            uploadBytes: jasmine.createSpy('uploadBytes').and.returnValue(Promise.resolve({})),
            getDownloadURL: jasmine.createSpy('getDownloadURL').and.returnValue(Promise.resolve('https://storage.url/foto.jpg')),
            deleteObject: jasmine.createSpy('deleteObject').and.returnValue(Promise.resolve())
        };

        // Mock do AuthService
        const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

        TestBed.configureTestingModule({
            providers: [
                DiarioBordoService,
                { provide: Firestore, useValue: mockFirestore },
                { provide: Storage, useValue: mockStorage },
                { provide: AuthService, useValue: authSpy }
            ]
        });

        service = TestBed.inject(DiarioBordoService);
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

        // Configurar usuário autenticado por padrão
        mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(mockUsuario));
    });

    describe('Integração com AuthService', () => {
        it('deve criar entrada com usuário autenticado', async () => {
            const viagemId = 'viagem-123';
            const diaViagemId = 'dia-123';

            const entradaId = await service.criarEntrada(viagemId, mockDiarioForm, diaViagemId);

            expect(entradaId).toBe('new-diario-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(viagemId);
            expect(dadosPassados.diaViagemId).toBe(diaViagemId);
            expect(dadosPassados.usuarioId).toBe(mockUsuario.uid);
            expect(dadosPassados.titulo).toBe(mockDiarioForm.titulo);
            expect(dadosPassados.conteudo).toBe(mockDiarioForm.conteudo);
            expect(dadosPassados.publico).toBe(mockDiarioForm.publico);
            expect(dadosPassados.tags).toEqual(mockDiarioForm.tags);
            expect(dadosPassados.criadoPor).toBe(mockUsuario.uid);
            expect(dadosPassados.atualizadoPor).toBe(mockUsuario.uid);
        });

        it('deve lançar erro se usuário não estiver autenticado', async () => {
            mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(null));

            await expectAsync(service.criarEntrada('viagem-123', mockDiarioForm))
                .toBeRejectedWithError('Usuário não autenticado');
        });

        it('deve listar apenas entradas do usuário autenticado', (done) => {
            service.listarEntradas().subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(mockFirestore.where).toHaveBeenCalledWith('usuarioId', '==', mockUsuario.uid);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('data', 'desc');
                done();
            });
        });

        it('deve retornar array vazio se usuário não estiver autenticado na listagem', (done) => {
            mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(null));

            service.listarEntradas().subscribe(entradas => {
                expect(entradas).toEqual([]);
                done();
            });
        });
    });

    describe('Integração com Firebase Storage - Upload de Fotos', () => {
        it('deve fazer upload de fotos ao criar entrada', async () => {
            const viagemId = 'viagem-123';
            const formComFotos: DiarioBordoForm = {
                ...mockDiarioForm,
                fotos: [mockFile]
            };

            const entradaId = await service.criarEntrada(viagemId, formComFotos);

            expect(mockStorage.ref).toHaveBeenCalled();
            expect(mockStorage.uploadBytes).toHaveBeenCalledWith({}, mockFile);
            expect(mockStorage.getDownloadURL).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.fotos).toEqual(['https://storage.url/foto.jpg']);
        });

        it('deve gerar nomes únicos para arquivos de foto', async () => {
            const viagemId = 'viagem-123';
            const formComFotos: DiarioBordoForm = {
                ...mockDiarioForm,
                fotos: [mockFile, mockFile] // Duas fotos iguais
            };

            spyOn(Date, 'now').and.returnValue(1640995200000);

            await service.criarEntrada(viagemId, formComFotos);

            expect(mockStorage.ref).toHaveBeenCalledTimes(2);
            
            const chamadas = mockStorage.ref.calls.allArgs();
            expect(chamadas[0][0]).toContain('diario/viagem-123/1640995200000_0_foto.jpg');
            expect(chamadas[1][0]).toContain('diario/viagem-123/1640995200000_1_foto.jpg');
        });

        it('deve adicionar novas fotos ao atualizar entrada', async () => {
            const entradaId = 'entrada-123';
            const entradaExistente = {
                ...mockDiarioBordo,
                fotos: ['https://storage.url/foto-antiga.jpg']
            };

            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(entradaExistente));

            const dadosAtualizacao: Partial<DiarioBordoForm> = {
                fotos: [mockFile]
            };

            await service.atualizarEntrada(entradaId, dadosAtualizacao);

            expect(mockStorage.uploadBytes).toHaveBeenCalled();
            expect(mockFirestore.updateDoc).toHaveBeenCalled();

            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.fotos).toEqual([
                'https://storage.url/foto-antiga.jpg',
                'https://storage.url/foto.jpg'
            ]);
        });

        it('deve remover fotos do storage ao excluir entrada', async () => {
            const entradaComFotos = {
                ...mockDiarioBordo,
                fotos: [
                    'https://storage.url/foto1.jpg',
                    'https://storage.url/foto2.jpg'
                ]
            };

            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(entradaComFotos));

            await service.removerEntrada('entrada-123');

            expect(mockStorage.deleteObject).toHaveBeenCalledTimes(2);
            expect(mockFirestore.deleteDoc).toHaveBeenCalled();
        });

        it('deve remover foto específica da entrada', async () => {
            const entradaComFotos = {
                ...mockDiarioBordo,
                fotos: [
                    'https://storage.url/foto1.jpg',
                    'https://storage.url/foto2.jpg'
                ]
            };

            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(entradaComFotos));

            await service.removerFoto('entrada-123', 'https://storage.url/foto1.jpg');

            expect(mockStorage.deleteObject).toHaveBeenCalledWith({});
            expect(mockFirestore.updateDoc).toHaveBeenCalled();

            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.fotos).toEqual(['https://storage.url/foto2.jpg']);
        });

        it('deve continuar mesmo se falhar ao remover foto do storage', async () => {
            const entradaComFotos = {
                ...mockDiarioBordo,
                fotos: ['https://storage.url/foto-inexistente.jpg']
            };

            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(entradaComFotos));
            mockStorage.deleteObject.and.returnValue(Promise.reject(new Error('Foto não encontrada')));

            // Não deve lançar erro
            await expectAsync(service.removerEntrada('entrada-123')).toBeResolved();

            expect(mockFirestore.deleteDoc).toHaveBeenCalled();
        });
    });

    describe('Operações CRUD com Firestore', () => {
        it('deve obter entrada por ID', async () => {
            const entrada = await service.obterPorId('entrada-123');

            expect(entrada).toEqual({
                id: mockDiarioBordo.id,
                ...mockDiarioBordo
            });
            expect(mockFirestore.getDoc).toHaveBeenCalled();
        });

        it('deve retornar null para entrada inexistente', async () => {
            mockFirestore.getDoc.and.returnValue(Promise.resolve({
                exists: () => false,
                data: () => null
            }));

            const entrada = await service.obterPorId('inexistente');

            expect(entrada).toBeNull();
        });

        it('deve atualizar entrada com timestamp automático', async () => {
            const dadosAtualizacao = {
                titulo: 'Título Atualizado',
                conteudo: 'Conteúdo atualizado'
            };

            await service.atualizarEntrada('entrada-123', dadosAtualizacao);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();

            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.titulo).toBe(dadosAtualizacao.titulo);
            expect(dadosPassados.conteudo).toBe(dadosAtualizacao.conteudo);
            expect(dadosPassados.atualizadoEm).toBeDefined();
            expect(dadosPassados.atualizadoPor).toBe(mockUsuario.uid);
        });

        it('deve lançar erro ao tentar remover entrada inexistente', async () => {
            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(null));

            await expectAsync(service.removerEntrada('inexistente'))
                .toBeRejectedWithError('Entrada não encontrada');
        });

        it('deve lançar erro ao tentar remover foto de entrada inexistente', async () => {
            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(null));

            await expectAsync(service.removerFoto('inexistente', 'foto.jpg'))
                .toBeRejectedWithError('Entrada ou foto não encontrada');
        });
    });

    describe('Filtros e Consultas', () => {
        it('deve listar entradas de uma viagem específica', (done) => {
            const viagemId = 'viagem-123';

            service.obterEntradasDaViagem(viagemId).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                done();
            });
        });

        it('deve listar entradas de um dia específico', (done) => {
            const diaViagemId = 'dia-123';

            service.obterEntradasDoDia(diaViagemId).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(mockFirestore.where).toHaveBeenCalledWith('diaViagemId', '==', diaViagemId);
                done();
            });
        });

        it('deve aplicar filtros múltiplos', (done) => {
            const filtros: DiarioBordoFiltros = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                publico: true
            };

            service.listarEntradas(filtros).subscribe(entradas => {
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', 'viagem-123');
                expect(mockFirestore.where).toHaveBeenCalledWith('diaViagemId', '==', 'dia-123');
                expect(mockFirestore.where).toHaveBeenCalledWith('publico', '==', true);
                done();
            });
        });

        it('deve buscar entradas por texto no título', (done) => {
            const termo = 'aventura';
            const entradaComTitulo = {
                ...mockDiarioBordo,
                titulo: 'Grande Aventura na Estrada'
            };

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: [{
                    id: entradaComTitulo.id,
                    data: () => entradaComTitulo
                }]
            }));

            service.buscarEntradas(termo).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(entradas[0].titulo).toContain('Aventura');
                done();
            });
        });

        it('deve buscar entradas por texto no conteúdo', (done) => {
            const termo = 'paisagem';
            const entradaComConteudo = {
                ...mockDiarioBordo,
                conteudo: 'A paisagem era incrível durante toda a viagem'
            };

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: [{
                    id: entradaComConteudo.id,
                    data: () => entradaComConteudo
                }]
            }));

            service.buscarEntradas(termo).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(entradas[0].conteudo).toContain('paisagem');
                done();
            });
        });

        it('deve buscar entradas por tags', (done) => {
            const termo = 'montanha';
            const entradaComTag = {
                ...mockDiarioBordo,
                tags: ['aventura', 'montanha', 'natureza']
            };

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: [{
                    id: entradaComTag.id,
                    data: () => entradaComTag
                }]
            }));

            service.buscarEntradas(termo).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(entradas[0].tags).toContain('montanha');
                done();
            });
        });

        it('deve buscar entradas case-insensitive', (done) => {
            const termo = 'AVENTURA';
            const entradaComTitulo = {
                ...mockDiarioBordo,
                titulo: 'pequena aventura'
            };

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: [{
                    id: entradaComTitulo.id,
                    data: () => entradaComTitulo
                }]
            }));

            service.buscarEntradas(termo).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                done();
            });
        });

        it('deve retornar array vazio quando não encontrar resultados na busca', (done) => {
            const termo = 'termo-inexistente';

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: [{
                    id: mockDiarioBordo.id,
                    data: () => mockDiarioBordo
                }]
            }));

            service.buscarEntradas(termo).subscribe(entradas => {
                expect(entradas.length).toBe(0);
                done();
            });
        });
    });

    describe('Tratamento de Erros', () => {
        it('deve tratar erro ao criar entrada', async () => {
            const erro = new Error('Firestore create error');
            mockFirestore.addDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.criarEntrada('viagem-123', mockDiarioForm))
                .toBeRejected();
        });

        it('deve tratar erro ao atualizar entrada', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.atualizarEntrada('entrada-123', { titulo: 'Novo Título' }))
                .toBeRejected();
        });

        it('deve tratar erro ao obter entrada por ID', async () => {
            const erro = new Error('Firestore get error');
            mockFirestore.getDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.obterPorId('entrada-123'))
                .toBeRejected();
        });

        it('deve tratar erro na listagem de entradas', (done) => {
            const erro = new Error('Firestore list error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            service.listarEntradas().subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err).toBeDefined();
                    done();
                }
            });
        });

        it('deve tratar erro no upload de fotos', async () => {
            const erro = new Error('Storage upload error');
            mockStorage.uploadBytes.and.returnValue(Promise.reject(erro));

            const formComFotos: DiarioBordoForm = {
                ...mockDiarioForm,
                fotos: [mockFile]
            };

            await expectAsync(service.criarEntrada('viagem-123', formComFotos))
                .toBeRejected();
        });

        it('deve tratar erro ao obter URL de download', async () => {
            const erro = new Error('Storage getDownloadURL error');
            mockStorage.getDownloadURL.and.returnValue(Promise.reject(erro));

            const formComFotos: DiarioBordoForm = {
                ...mockDiarioForm,
                fotos: [mockFile]
            };

            await expectAsync(service.criarEntrada('viagem-123', formComFotos))
                .toBeRejected();
        });
    });

    describe('Cenários Complexos', () => {
        it('deve criar entrada sem dia específico', async () => {
            const viagemId = 'viagem-123';

            const entradaId = await service.criarEntrada(viagemId, mockDiarioForm);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(viagemId);
            expect(dadosPassados.diaViagemId).toBeUndefined();
        });

        it('deve preservar fotos existentes ao atualizar outros campos', async () => {
            const entradaExistente = {
                ...mockDiarioBordo,
                fotos: ['https://storage.url/foto-existente.jpg']
            };

            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(entradaExistente));

            const dadosAtualizacao = {
                titulo: 'Novo Título',
                publico: true
            };

            await service.atualizarEntrada('entrada-123', dadosAtualizacao);

            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.titulo).toBe('Novo Título');
            expect(dadosPassados.publico).toBe(true);
            expect(dadosPassados.fotos).toBeUndefined(); // Não deve alterar fotos
        });

        it('deve lidar com entrada sem fotos ao remover', async () => {
            const entradaSemFotos = {
                ...mockDiarioBordo,
                fotos: undefined
            };

            spyOn(service, 'obterPorId').and.returnValue(Promise.resolve(entradaSemFotos));

            await service.removerEntrada('entrada-123');

            expect(mockStorage.deleteObject).not.toHaveBeenCalled();
            expect(mockFirestore.deleteDoc).toHaveBeenCalled();
        });

        it('deve lidar com múltiplas operações simultâneas', async () => {
            const operacoes = [
                service.criarEntrada('viagem-1', { ...mockDiarioForm, titulo: 'Entrada 1' }),
                service.criarEntrada('viagem-2', { ...mockDiarioForm, titulo: 'Entrada 2' }),
                service.criarEntrada('viagem-3', { ...mockDiarioForm, titulo: 'Entrada 3' })
            ];

            const resultados = await Promise.all(operacoes);

            expect(resultados).toEqual(['new-diario-id', 'new-diario-id', 'new-diario-id']);
            expect(mockFirestore.addDoc).toHaveBeenCalledTimes(3);
        });

        it('deve gerar data atual automaticamente ao criar entrada', async () => {
            const dataEsperada = '2024-06-01';
            spyOn(Date.prototype, 'toISOString').and.returnValue('2024-06-01T12:00:00.000Z');

            await service.criarEntrada('viagem-123', mockDiarioForm);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.data).toBe(dataEsperada);
        });
    });

    describe('Compatibilidade com Exportação', () => {
        it('deve ter método listarPorViagem para compatibilidade', (done) => {
            const viagemId = 'viagem-123';

            service.listarPorViagem(viagemId).subscribe(entradas => {
                expect(entradas.length).toBe(1);
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                done();
            });
        });

        it('deve retornar dados no formato esperado pela exportação', (done) => {
            service.listarPorViagem('viagem-123').subscribe(entradas => {
                const entrada = entradas[0];
                
                expect(entrada.id).toBeDefined();
                expect(entrada.viagemId).toBeDefined();
                expect(entrada.usuarioId).toBeDefined();
                expect(entrada.titulo).toBeDefined();
                expect(entrada.conteudo).toBeDefined();
                expect(entrada.data).toBeDefined();
                expect(entrada.criadoEm).toBeDefined();
                expect(entrada.atualizadoEm).toBeDefined();
                
                done();
            });
        });
    });
});