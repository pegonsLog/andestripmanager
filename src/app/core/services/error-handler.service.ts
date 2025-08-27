import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

export interface AppError {
    message: string;
    code?: string;
    details?: any;
    timestamp: Date;
    userMessage: string;
}

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {

    /**
     * Trata erros da aplicação e retorna mensagem amigável
     */
    handleError(error: any): Observable<never> {
        const appError = this.createAppError(error);

        // Log do erro para debugging
        console.error('Erro da aplicação:', appError);

        return throwError(() => appError);
    }

    /**
     * Cria objeto de erro padronizado
     */
    private createAppError(error: any): AppError {
        const timestamp = new Date();

        // Erro do Firebase
        if (error?.code?.startsWith('auth/') || error?.code?.startsWith('firestore/')) {
            return {
                message: error.message,
                code: error.code,
                details: error,
                timestamp,
                userMessage: this.getFirebaseErrorMessage(error.code)
            };
        }

        // Erro de rede
        if (error?.status === 0 || error?.name === 'NetworkError') {
            return {
                message: 'Erro de conexão',
                code: 'NETWORK_ERROR',
                details: error,
                timestamp,
                userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.'
            };
        }

        // Erro HTTP
        if (error?.status) {
            return {
                message: error.message || 'Erro HTTP',
                code: `HTTP_${error.status}`,
                details: error,
                timestamp,
                userMessage: this.getHttpErrorMessage(error.status)
            };
        }

        // Erro genérico
        return {
            message: error?.message || 'Erro desconhecido',
            code: 'UNKNOWN_ERROR',
            details: error,
            timestamp,
            userMessage: 'Ocorreu um erro inesperado. Tente novamente.'
        };
    }

    /**
     * Retorna mensagem amigável para erros do Firebase
     */
    private getFirebaseErrorMessage(code: string): string {
        const messages: { [key: string]: string } = {
            // Auth errors
            'auth/user-not-found': 'Usuário não encontrado',
            'auth/wrong-password': 'Senha incorreta',
            'auth/email-already-in-use': 'Este email já está em uso',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
            'auth/invalid-email': 'Email inválido',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
            'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',

            // Firestore errors
            'firestore/permission-denied': 'Você não tem permissão para esta ação',
            'firestore/unavailable': 'Serviço temporariamente indisponível',
            'firestore/deadline-exceeded': 'Tempo limite excedido. Tente novamente',
            'firestore/not-found': 'Documento não encontrado',
            'firestore/already-exists': 'Documento já existe'
        };

        return messages[code] || 'Erro no servidor. Tente novamente.';
    }

    /**
     * Retorna mensagem amigável para erros HTTP
     */
    private getHttpErrorMessage(status: number): string {
        const messages: { [key: number]: string } = {
            400: 'Dados inválidos enviados',
            401: 'Você precisa fazer login novamente',
            403: 'Você não tem permissão para esta ação',
            404: 'Recurso não encontrado',
            408: 'Tempo limite da requisição excedido',
            429: 'Muitas requisições. Tente novamente mais tarde',
            500: 'Erro interno do servidor',
            502: 'Servidor temporariamente indisponível',
            503: 'Serviço temporariamente indisponível',
            504: 'Tempo limite do servidor excedido'
        };

        return messages[status] || 'Erro no servidor. Tente novamente.';
    }

    /**
     * Registra erro para análise posterior
     */
    logError(error: AppError, context?: string): void {
        const logEntry = {
            ...error,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Em produção, enviar para serviço de logging
        console.error('Error logged:', logEntry);
    }
}