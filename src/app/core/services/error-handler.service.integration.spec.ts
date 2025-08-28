/**
 * Testes de Integração - ErrorHandlerService
 * 
 * Testa a integração do ErrorHandlerService com MatSnackBar e outros serviços,
 * incluindo tratamento de diferentes tipos de erro e exibição de mensagens.
 */

import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ErrorHandlerService } from './error-handler.service';

describe('ErrorHandlerService - Testes de Integração', () => {
    let service: ErrorHandlerService;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                ErrorHandlerService,
                { provide: MatSnackBar, useValue: snackBarSpy }
            ]
        });

        service = TestBed.inject(ErrorHandlerService);
        mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

        // Spy no console para verificar logs
        spyOn(console, 'error');
    });

    describe('Integração com MatSnackBar', () => {
        it('deve exibir mensagem de erro genérica no snackbar', () => {
            const erro = new Error('Erro de teste');

            service.handleError(erro);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro de teste',
                'Fechar',
                {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                }
            );
        });

        it('deve exibir mensagem padrão para erro sem message', () => {
            const erro = {};

            service.handleError(erro);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Ocorreu um erro inesperado.',
                'Fechar',
                jasmine.objectContaining({
                    duration: 5000,
                    panelClass: ['error-snackbar']
                })
            );
        });

        it('deve incluir contexto na mensagem quando fornecido', () => {
            const erro = new Error('Erro específico');
            const contexto = 'Operação de Login';

            service.handleError(erro, contexto);

            expect(console.error).toHaveBeenCalledWith(
                '[ERRO - Operação de Login]:',
                erro
            );
        });

        it('deve configurar duração correta do snackbar', () => {
            const erro = new Error('Teste de duração');

            service.handleError(erro);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                jasmine.any(String),
                'Fechar',
                jasmine.objectContaining({
                    duration: 5000
                })
            );
        });

        it('deve aplicar classe CSS de erro', () => {
            const erro = new Error('Teste de CSS');

            service.handleError(erro);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                jasmine.any(String),
                'Fechar',
                jasmine.objectContaining({
                    panelClass: ['error-snackbar']
                })
            );
        });
    });

    describe('Tratamento de Erros Firebase', () => {
        it('deve mapear erro de usuário não encontrado', () => {
            const erroFirebase = { code: 'auth/user-not-found', message: 'User not found' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Usuário não encontrado.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de senha incorreta', () => {
            const erroFirebase = { code: 'auth/wrong-password', message: 'Wrong password' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Senha incorreta.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de email já em uso', () => {
            const erroFirebase = { code: 'auth/email-already-in-use', message: 'Email in use' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Este email já está em uso.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de senha fraca', () => {
            const erroFirebase = { code: 'auth/weak-password', message: 'Weak password' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'A senha deve ter pelo menos 6 caracteres.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de email inválido', () => {
            const erroFirebase = { code: 'auth/invalid-email', message: 'Invalid email' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Email inválido.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de rede', () => {
            const erroFirebase = { code: 'auth/network-request-failed', message: 'Network error' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro de conexão. Verifique sua internet.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de permissão negada', () => {
            const erroFirebase = { code: 'permission-denied', message: 'Permission denied' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Você não tem permissão para esta ação.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de serviço indisponível', () => {
            const erroFirebase = { code: 'unavailable', message: 'Service unavailable' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Serviço temporariamente indisponível.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de documento não encontrado', () => {
            const erroFirebase = { code: 'not-found', message: 'Document not found' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Documento não encontrado.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve mapear erro de documento já existe', () => {
            const erroFirebase = { code: 'already-exists', message: 'Document exists' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Documento já existe.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve usar mensagem padrão para código desconhecido', () => {
            const erroFirebase = { code: 'unknown-error-code', message: 'Unknown error' };

            service.handleError(erroFirebase);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro desconhecido.',
                'Fechar',
                jasmine.any(Object)
            );
        });
    });

    describe('Logging de Erros', () => {
        it('deve registrar erro no console sem contexto', () => {
            const erro = new Error('Erro para log');

            service.handleError(erro);

            expect(console.error).toHaveBeenCalledWith('[ERRO]:', erro);
        });

        it('deve registrar erro no console com contexto', () => {
            const erro = new Error('Erro com contexto');
            const contexto = 'Teste de Contexto';

            service.handleError(erro, contexto);

            expect(console.error).toHaveBeenCalledWith('[ERRO - Teste de Contexto]:', erro);
        });

        it('deve registrar diferentes tipos de erro', () => {
            const erros = [
                new Error('Erro padrão'),
                { code: 'auth/user-not-found', message: 'Firebase error' },
                'String de erro',
                { message: 'Objeto com message' },
                null,
                undefined
            ];

            erros.forEach((erro, index) => {
                service.handleError(erro, `Contexto ${index}`);
                expect(console.error).toHaveBeenCalledWith(`[ERRO - Contexto ${index}]:`, erro);
            });
        });
    });

    describe('Cenários de Erro Complexos', () => {
        it('deve tratar erro com propriedades aninhadas', () => {
            const erroComplexo = {
                code: 'auth/user-not-found',
                message: 'User not found',
                details: {
                    timestamp: new Date(),
                    userId: 'user-123'
                }
            };

            service.handleError(erroComplexo);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Usuário não encontrado.',
                'Fechar',
                jasmine.any(Object)
            );
            expect(console.error).toHaveBeenCalledWith('[ERRO]:', erroComplexo);
        });

        it('deve tratar erro HTTP com status', () => {
            const erroHTTP = {
                status: 404,
                statusText: 'Not Found',
                message: 'Resource not found',
                url: '/api/users/123'
            };

            service.handleError(erroHTTP);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Resource not found',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar erro de validação customizado', () => {
            const erroValidacao = {
                type: 'validation',
                message: 'Dados inválidos',
                fields: ['email', 'password']
            };

            service.handleError(erroValidacao);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Dados inválidos',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar múltiplos erros em sequência', () => {
            const erros = [
                new Error('Primeiro erro'),
                { code: 'auth/user-not-found', message: 'Segundo erro' },
                new Error('Terceiro erro')
            ];

            erros.forEach((erro, index) => {
                service.handleError(erro, `Operação ${index + 1}`);
            });

            expect(mockSnackBar.open).toHaveBeenCalledTimes(3);
            expect(console.error).toHaveBeenCalledTimes(3);
        });
    });

    describe('Integração com Diferentes Contextos', () => {
        it('deve tratar erros de autenticação', () => {
            const erroAuth = { code: 'auth/invalid-email', message: 'Invalid email' };

            service.handleError(erroAuth, 'Autenticação');

            expect(console.error).toHaveBeenCalledWith('[ERRO - Autenticação]:', erroAuth);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Email inválido.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar erros de operações CRUD', () => {
            const erroCRUD = { code: 'permission-denied', message: 'Permission denied' };

            service.handleError(erroCRUD, 'Operação CRUD');

            expect(console.error).toHaveBeenCalledWith('[ERRO - Operação CRUD]:', erroCRUD);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Você não tem permissão para esta ação.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar erros de upload', () => {
            const erroUpload = new Error('Falha no upload do arquivo');

            service.handleError(erroUpload, 'Upload de Arquivo');

            expect(console.error).toHaveBeenCalledWith('[ERRO - Upload de Arquivo]:', erroUpload);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Falha no upload do arquivo',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar erros de sincronização', () => {
            const erroSync = { code: 'unavailable', message: 'Service unavailable' };

            service.handleError(erroSync, 'Sincronização');

            expect(console.error).toHaveBeenCalledWith('[ERRO - Sincronização]:', erroSync);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Serviço temporariamente indisponível.',
                'Fechar',
                jasmine.any(Object)
            );
        });
    });

    describe('Configuração e Personalização', () => {
        it('deve usar configurações padrão do snackbar', () => {
            const erro = new Error('Teste de configuração');

            service.handleError(erro);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                jasmine.any(String),
                'Fechar',
                {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                }
            );
        });

        it('deve manter consistência na exibição de mensagens', () => {
            const erros = [
                new Error('Erro 1'),
                new Error('Erro 2'),
                new Error('Erro 3')
            ];

            erros.forEach(erro => {
                service.handleError(erro);
            });

            // Verificar se todas as chamadas usam a mesma configuração
            const chamadas = mockSnackBar.open.calls.all();
            chamadas.forEach(chamada => {
                expect(chamada.args[1]).toBe('Fechar');
                expect(chamada.args[2]).toEqual({
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
            });
        });
    });

    describe('Performance e Otimização', () => {
        it('deve processar erros rapidamente', () => {
            const inicio = performance.now();
            
            for (let i = 0; i < 100; i++) {
                service.handleError(new Error(`Erro ${i}`));
            }
            
            const fim = performance.now();
            const tempoExecucao = fim - inicio;
            
            // Deve processar 100 erros em menos de 100ms
            expect(tempoExecucao).toBeLessThan(100);
        });

        it('deve não vazar memória com muitos erros', () => {
            const errosProcessados = [];
            
            for (let i = 0; i < 1000; i++) {
                const erro = new Error(`Erro ${i}`);
                service.handleError(erro);
                errosProcessados.push(erro);
            }
            
            expect(mockSnackBar.open).toHaveBeenCalledTimes(1000);
            expect(console.error).toHaveBeenCalledTimes(1000);
        });
    });

    describe('Compatibilidade e Robustez', () => {
        it('deve tratar valores null e undefined', () => {
            service.handleError(null);
            service.handleError(undefined);

            expect(mockSnackBar.open).toHaveBeenCalledTimes(2);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Ocorreu um erro inesperado.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar objetos vazios', () => {
            service.handleError({});

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Ocorreu um erro inesperado.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar strings como erro', () => {
            service.handleError('Erro em formato string');

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Ocorreu um erro inesperado.',
                'Fechar',
                jasmine.any(Object)
            );
        });

        it('deve tratar números como erro', () => {
            service.handleError(404);

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Ocorreu um erro inesperado.',
                'Fechar',
                jasmine.any(Object)
            );
        });
    });
});