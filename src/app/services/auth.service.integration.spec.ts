/**
 * Testes de Integração - AuthService
 * 
 * Testa a integração do AuthService com Firebase Authentication e Firestore,
 * incluindo cenários de erro e tratamento de dados.
 */

import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { Usuario } from '../models';
import { MockDataFactory, FirebaseMocks } from '../testing/test-utils';

describe('AuthService - Testes de Integração', () => {
    let service: AuthService;
    let mockAuth: jasmine.SpyObj<Auth>;
    let mockFirestore: jasmine.SpyObj<Firestore>;

    const mockUsuario = MockDataFactory.createUsuario();

    beforeEach(() => {
        const authSpy = jasmine.createSpyObj('Auth', ['signInWithEmailAndPassword', 'createUserWithEmailAndPassword', 'signOut']);
        const firestoreSpy = jasmine.createSpyObj('Firestore', ['doc', 'getDoc', 'setDoc', 'updateDoc']);

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: Auth, useValue: authSpy },
                { provide: Firestore, useValue: firestoreSpy }
            ]
        });

        service = TestBed.inject(AuthService);
        mockAuth = TestBed.inject(Auth) as jasmine.SpyObj<Auth>;
        mockFirestore = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
    });

    describe('Integração com Firebase Authentication', () => {
        it('deve fazer login com credenciais válidas', async () => {
            const mockUserCredential = {
                user: { uid: 'user-123', email: 'test@example.com' }
            };

            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.resolve(mockUserCredential as any));

            await expectAsync(service.login('test@example.com', 'password123'))
                .toBeResolved();

            expect(mockAuth.signInWithEmailAndPassword)
                .toHaveBeenCalledWith('test@example.com', 'password123');
        });

        it('deve tratar erro de usuário não encontrado', async () => {
            const authError = { code: 'auth/user-not-found' };
            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.reject(authError));

            await expectAsync(service.login('test@example.com', 'password123'))
                .toBeRejectedWithError('Usuário não encontrado');
        });

        it('deve tratar erro de senha incorreta', async () => {
            const authError = { code: 'auth/wrong-password' };
            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.reject(authError));

            await expectAsync(service.login('test@example.com', 'wrongpassword'))
                .toBeRejectedWithError('Senha incorreta');
        });

        it('deve tratar erro de email inválido', async () => {
            const authError = { code: 'auth/invalid-email' };
            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.reject(authError));

            await expectAsync(service.login('invalid-email', 'password123'))
                .toBeRejectedWithError('Email inválido');
        });

        it('deve tratar erro de muitas tentativas', async () => {
            const authError = { code: 'auth/too-many-requests' };
            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.reject(authError));

            await expectAsync(service.login('test@example.com', 'password123'))
                .toBeRejectedWithError('Muitas tentativas. Tente novamente mais tarde');
        });
    });

    describe('Integração com Firestore - Registro de Usuário', () => {
        it('deve registrar usuário e criar documento no Firestore', async () => {
            const mockUserCredential = {
                user: { uid: 'user-123', email: 'test@example.com' }
            };

            mockAuth.createUserWithEmailAndPassword.and.returnValue(Promise.resolve(mockUserCredential as any));
            mockFirestore.setDoc = jasmine.createSpy('setDoc').and.returnValue(Promise.resolve());

            const dadosUsuario = {
                nome: 'João Silva',
                telefone: '(11) 99999-9999'
            };

            await expectAsync(service.register('test@example.com', 'password123', dadosUsuario))
                .toBeResolved();

            expect(mockAuth.createUserWithEmailAndPassword)
                .toHaveBeenCalledWith('test@example.com', 'password123');
            expect(mockFirestore.setDoc).toHaveBeenCalled();
        });

        it('deve tratar erro de email já em uso', async () => {
            const authError = { code: 'auth/email-already-in-use' };
            mockAuth.createUserWithEmailAndPassword.and.returnValue(Promise.reject(authError));

            await expectAsync(service.register('test@example.com', 'password123', {}))
                .toBeRejectedWithError('Email já está em uso');
        });

        it('deve tratar erro de senha fraca', async () => {
            const authError = { code: 'auth/weak-password' };
            mockAuth.createUserWithEmailAndPassword.and.returnValue(Promise.reject(authError));

            await expectAsync(service.register('test@example.com', '123', {}))
                .toBeRejectedWithError('Senha muito fraca');
        });
    });

    describe('Integração com Firestore - Dados do Usuário', () => {
        it('deve buscar dados do usuário do Firestore', async () => {
            const mockDocSnap = {
                exists: () => true,
                data: () => mockUsuario
            };

            mockFirestore.getDoc = jasmine.createSpy('getDoc').and.returnValue(Promise.resolve(mockDocSnap));

            const userData = await (service as any).getUserData('user-123');

            expect(userData).toEqual(mockUsuario);
            expect(mockFirestore.getDoc).toHaveBeenCalled();
        });

        it('deve retornar null se usuário não existir no Firestore', async () => {
            const mockDocSnap = {
                exists: () => false,
                data: () => null
            };

            mockFirestore.getDoc = jasmine.createSpy('getDoc').and.returnValue(Promise.resolve(mockDocSnap));

            const userData = await (service as any).getUserData('user-123');

            expect(userData).toBeNull();
        });

        it('deve tratar erro ao buscar dados do usuário', async () => {
            mockFirestore.getDoc = jasmine.createSpy('getDoc').and.returnValue(Promise.reject(new Error('Firestore error')));

            const userData = await (service as any).getUserData('user-123');

            expect(userData).toBeNull();
        });

        it('deve atualizar dados do usuário no Firestore', async () => {
            // Simular usuário logado
            spyOn(service, 'getCurrentUser').and.returnValue(mockUsuario);

            mockFirestore.updateDoc = jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve());

            const dadosAtualizados = {
                nome: 'João Silva Atualizado',
                telefone: '(11) 88888-8888'
            };

            await expectAsync(service.updateUserData(dadosAtualizados))
                .toBeResolved();

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
        });

        it('deve lançar erro se tentar atualizar sem usuário logado', async () => {
            spyOn(service, 'getCurrentUser').and.returnValue(null);

            await expectAsync(service.updateUserData({ nome: 'Teste' }))
                .toBeRejectedWithError('Usuário não autenticado');
        });
    });

    describe('Recuperação de Senha', () => {
        it('deve enviar email de recuperação de senha', async () => {
            mockAuth.sendPasswordResetEmail = jasmine.createSpy('sendPasswordResetEmail')
                .and.returnValue(Promise.resolve());

            await expectAsync(service.resetPassword('test@example.com'))
                .toBeResolved();

            expect(mockAuth.sendPasswordResetEmail)
                .toHaveBeenCalledWith('test@example.com');
        });

        it('deve tratar erro de email não encontrado na recuperação', async () => {
            const authError = { code: 'auth/user-not-found' };
            mockAuth.sendPasswordResetEmail = jasmine.createSpy('sendPasswordResetEmail')
                .and.returnValue(Promise.reject(authError));

            await expectAsync(service.resetPassword('test@example.com'))
                .toBeRejectedWithError('Usuário não encontrado');
        });
    });

    describe('Logout', () => {
        it('deve fazer logout com sucesso', async () => {
            mockAuth.signOut.and.returnValue(Promise.resolve());

            await expectAsync(service.logout())
                .toBeResolved();

            expect(mockAuth.signOut).toHaveBeenCalled();
        });

        it('deve tratar erro durante logout', async () => {
            const authError = new Error('Logout error');
            mockAuth.signOut.and.returnValue(Promise.reject(authError));

            await expectAsync(service.logout())
                .toBeRejectedWithError('Logout error');
        });
    });

    describe('Estado de Autenticação', () => {
        it('deve retornar usuário atual quando autenticado', () => {
            (service as any).currentUserSubject.next(mockUsuario);

            const currentUser = service.getCurrentUser();

            expect(currentUser).toEqual(mockUsuario);
        });

        it('deve retornar null quando não autenticado', () => {
            (service as any).currentUserSubject.next(null);

            const currentUser = service.getCurrentUser();

            expect(currentUser).toBeNull();
        });

        it('deve retornar true quando autenticado', () => {
            (service as any).isAuthenticatedSubject.next(true);

            const isAuthenticated = service.isAuthenticated();

            expect(isAuthenticated).toBeTrue();
        });

        it('deve retornar false quando não autenticado', () => {
            (service as any).isAuthenticatedSubject.next(false);

            const isAuthenticated = service.isAuthenticated();

            expect(isAuthenticated).toBeFalse();
        });
    });

    describe('Observables de Estado', () => {
        it('deve emitir mudanças no usuário atual', (done) => {
            service.currentUser$.subscribe(user => {
                if (user) {
                    expect(user).toEqual(mockUsuario);
                    done();
                }
            });

            (service as any).currentUserSubject.next(mockUsuario);
        });

        it('deve emitir mudanças no estado de autenticação', (done) => {
            service.isAuthenticated$.subscribe(isAuth => {
                if (isAuth) {
                    expect(isAuth).toBeTrue();
                    done();
                }
            });

            (service as any).isAuthenticatedSubject.next(true);
        });
    });

    describe('Tratamento de Erros Genéricos', () => {
        it('deve tratar erro desconhecido com mensagem padrão', async () => {
            const unknownError = { code: 'unknown-error', message: 'Erro desconhecido' };
            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.reject(unknownError));

            await expectAsync(service.login('test@example.com', 'password123'))
                .toBeRejectedWithError('Erro desconhecido');
        });

        it('deve tratar erro sem código com mensagem genérica', async () => {
            const genericError = new Error('Erro genérico');
            mockAuth.signInWithEmailAndPassword.and.returnValue(Promise.reject(genericError));

            await expectAsync(service.login('test@example.com', 'password123'))
                .toBeRejectedWithError('Erro genérico');
        });
    });
});