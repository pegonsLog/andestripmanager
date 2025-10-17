import { Injectable } from '@angular/core';
import {
    Auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    User,
    onAuthStateChanged
} from '@angular/fire/auth';
import {
    Firestore,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Usuario } from '../../models';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    constructor(
        private auth: Auth,
        private firestore: Firestore
    ) {
        this.initAuthListener();
    }

    /**
     * Inicializa o listener de mudanças de autenticação
     */
    private initAuthListener(): void {
        onAuthStateChanged(this.auth, async (user: User | null) => {
            if (user) {
                // Buscar dados do usuário no Firestore
                let userData = await this.getUserData(user.uid);

                // Se não existir documento do usuário, cria um documento padrão
                if (!userData) {
                    const novoUsuario: Usuario = {
                        id: user.uid,
                        email: user.email || '',
                        nome: user.displayName || (user.email ? user.email.split('@')[0] : ''),
                        criadoEm: new Date() as any,
                        atualizadoEm: new Date() as any
                    };

                    try {
                        await this.createUserDocument(novoUsuario);
                        userData = novoUsuario;
                    } catch (e) {
                        // Em caso de falha na criação do documento, mantém autenticado mas sem dados estendidos
                        // Contudo, para evitar quebra em serviços que exigem id, garantimos o id ao menos
                        userData = novoUsuario;
                    }
                }

                this.currentUserSubject.next(userData);
                this.isAuthenticatedSubject.next(true);
            } else {
                this.currentUserSubject.next(null);
                this.isAuthenticatedSubject.next(false);
            }
        });
    }

    /**
     * Realiza login com email e senha
     */
    async login(email: string, senha: string): Promise<void> {
        try {
            await signInWithEmailAndPassword(this.auth, email, senha);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Registra novo usuário
     */
    async register(email: string, senha: string, dadosUsuario: Partial<Usuario>): Promise<void> {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, senha);

            // Criar documento do usuário no Firestore
            const usuario: Usuario = {
                id: userCredential.user.uid,
                email: email,
                nome: dadosUsuario.nome || '',
                cpf: dadosUsuario.cpf,
                telefone: dadosUsuario.telefone,
                motocicleta: dadosUsuario.motocicleta,
                criadoEm: new Date() as any,
                atualizadoEm: new Date() as any
            };

            await this.createUserDocument(usuario);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Realiza logout
     */
    async logout(): Promise<void> {
        try {
            // Limpar estado imediatamente antes do signOut
            this.currentUserSubject.next(null);
            this.isAuthenticatedSubject.next(false);
            
            await signOut(this.auth);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Envia email de recuperação de senha
     */
    async resetPassword(email: string): Promise<void> {
        try {
            await sendPasswordResetEmail(this.auth, email);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Obtém dados do usuário atual
     */
    getCurrentUser(): Usuario | null {
        return this.currentUserSubject.value;
    }

    /**
     * Verifica se usuário está autenticado
     */
    isAuthenticated(): boolean {
        return this.isAuthenticatedSubject.value;
    }

    /**
     * Obtém dados do usuário do Firestore
     */
    private async getUserData(uid: string): Promise<Usuario | null> {
        try {
            const userDoc = await getDoc(doc(this.firestore, 'usuarios', uid));
            return userDoc.exists() ? userDoc.data() as Usuario : null;
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return null;
        }
    }

    /**
     * Cria documento do usuário no Firestore
     */
    private async createUserDocument(usuario: Usuario): Promise<void> {
        const userRef = doc(this.firestore, 'usuarios', usuario.id!);
        await setDoc(userRef, usuario);
    }

    /**
     * Atualiza dados do usuário
     */
    async updateUserData(dadosAtualizados: Partial<Usuario>): Promise<void> {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.id) {
            throw new Error('Usuário não autenticado');
        }

        try {
            const userRef = doc(this.firestore, 'usuarios', currentUser.id);
            
            // Remover campos undefined para evitar erro do Firestore
            const dadosLimpos = Object.entries(dadosAtualizados).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {} as any);
            
            await updateDoc(userRef, {
                ...dadosLimpos,
                atualizadoEm: new Date()
            });

            // Atualizar dados locais
            const updatedUser = { ...currentUser, ...dadosAtualizados };
            this.currentUserSubject.next(updatedUser);
        } catch (error: any) {
            console.error('Erro ao atualizar dados do usuário:', error);
            throw new Error(`Erro ao atualizar dados do usuário: ${error.message || error}`);
        }
    }

    /**
     * Trata erros de autenticação
     */
    private handleAuthError(error: any): Error {
        let message = 'Erro de autenticação';

        // Log do erro completo para debug
        console.error('Erro de autenticação completo:', error);

        switch (error.code) {
            case 'auth/user-not-found':
                message = 'Usuário não encontrado';
                break;
            case 'auth/wrong-password':
                message = 'Senha incorreta';
                break;
            case 'auth/invalid-credential':
                message = 'Email ou senha incorretos';
                break;
            case 'auth/invalid-login-credentials':
                message = 'Credenciais de login inválidas';
                break;
            case 'auth/email-already-in-use':
                message = 'Email já está em uso';
                break;
            case 'auth/weak-password':
                message = 'Senha muito fraca';
                break;
            case 'auth/invalid-email':
                message = 'Email inválido';
                break;
            case 'auth/user-disabled':
                message = 'Usuário desabilitado';
                break;
            case 'auth/too-many-requests':
                message = 'Muitas tentativas. Tente novamente mais tarde';
                break;
            case 'auth/network-request-failed':
                message = 'Erro de conexão. Verifique sua internet';
                break;
            case 'auth/operation-not-allowed':
                message = 'Operação não permitida';
                break;
            case 'auth/missing-password':
                message = 'Senha não fornecida';
                break;
            default:
                message = error.message || 'Erro desconhecido';
        }

        return new Error(message);
    }
}