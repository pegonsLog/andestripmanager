import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { switchMap, retryWhen, take, delay, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Interface para configuração de retry
 */
export interface RetryConfig {
    maxTentativas: number;
    delayInicial: number;
    multiplicadorDelay: number;
    delayMaximo: number;
}

/**
 * Configuração padrão de retry
 */
export const RETRY_CONFIG_PADRAO: RetryConfig = {
    maxTentativas: 3,
    delayInicial: 1000, // 1 segundo
    multiplicadorDelay: 2,
    delayMaximo: 10000 // 10 segundos
};

/**
 * Interface para log de operação
 */
export interface LogOperacao {
    id: string;
    operacao: string;
    timestamp: string;
    status: 'iniciado' | 'sucesso' | 'erro' | 'retry';
    detalhes?: any;
    erro?: string;
    tentativa?: number;
    tempoExecucao?: number;
}

/**
 * Tipos de erro conhecidos
 */
export enum TipoErro {
    REDE = 'network',
    AUTENTICACAO = 'auth',
    PERMISSAO = 'permission',
    VALIDACAO = 'validation',
    SERVIDOR = 'server',
    TIMEOUT = 'timeout',
    ARQUIVO = 'file',
    DESCONHECIDO = 'unknown'
}

/**
 * Interface para erro tratado
 */
export interface ErroTratado {
    tipo: TipoErro;
    mensagemUsuario: string;
    mensagemTecnica: string;
    codigo?: string;
    podeRetentar: boolean;
    acoesSugeridas: string[];
}

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {
    private logs: LogOperacao[] = [];
    private readonly MAX_LOGS = 1000;

    constructor(private snackBar: MatSnackBar) { }

    /**
     * Executa operação com retry automático
     */
    executarComRetry<T>(
        operacao: () => Observable<T>,
        nomeOperacao: string,
        config: RetryConfig = RETRY_CONFIG_PADRAO
    ): Observable<T> {
        const logId = this.gerarIdLog();
        const inicioOperacao = Date.now();

        this.adicionarLog({
            id: logId,
            operacao: nomeOperacao,
            timestamp: new Date().toISOString(),
            status: 'iniciado'
        });

        return operacao().pipe(
            tap(() => {
                const tempoExecucao = Date.now() - inicioOperacao;
                this.adicionarLog({
                    id: logId,
                    operacao: nomeOperacao,
                    timestamp: new Date().toISOString(),
                    status: 'sucesso',
                    tempoExecucao
                });
            }),
            retryWhen(errors =>
                errors.pipe(
                    switchMap((error, index) => {
                        const tentativa = index + 1;

                        if (tentativa > config.maxTentativas) {
                            this.adicionarLog({
                                id: logId,
                                operacao: nomeOperacao,
                                timestamp: new Date().toISOString(),
                                status: 'erro',
                                erro: error.message,
                                tentativa,
                                tempoExecucao: Date.now() - inicioOperacao
                            });

                            return throwError(() => error);
                        }

                        const erroTratado = this.tratarErro(error);

                        if (!erroTratado.podeRetentar) {
                            this.adicionarLog({
                                id: logId,
                                operacao: nomeOperacao,
                                timestamp: new Date().toISOString(),
                                status: 'erro',
                                erro: error.message,
                                tentativa,
                                detalhes: 'Erro não permite retry'
                            });

                            return throwError(() => error);
                        }

                        const delayAtual = Math.min(
                            config.delayInicial * Math.pow(config.multiplicadorDelay, index),
                            config.delayMaximo
                        );

                        this.adicionarLog({
                            id: logId,
                            operacao: nomeOperacao,
                            timestamp: new Date().toISOString(),
                            status: 'retry',
                            erro: error.message,
                            tentativa,
                            detalhes: `Tentando novamente em ${delayAtual}ms`
                        });

                        console.warn(`[RETRY] ${nomeOperacao} - Tentativa ${tentativa}/${config.maxTentativas} em ${delayAtual}ms`);

                        return timer(delayAtual);
                    }),
                    take(config.maxTentativas)
                )
            )
        );
    }

    /**
     * Trata erro e retorna informações estruturadas
     */
    tratarErro(error: any): ErroTratado {
        console.error('[ERRO] Tratando erro:', error);

        let tipo = TipoErro.DESCONHECIDO;
        let mensagemUsuario = 'Ocorreu um erro inesperado';
        let mensagemTecnica = error?.message || 'Erro desconhecido';
        let codigo = error?.code;
        let podeRetentar = true;
        let acoesSugeridas: string[] = [];

        // Analisar tipo de erro
        if (error?.message || error?.code) {
            const errorStr = (error.message || error.code || '').toLowerCase();

            // Erros de rede
            if (errorStr.includes('network') ||
                errorStr.includes('connection') ||
                errorStr.includes('timeout') ||
                errorStr.includes('fetch')) {
                tipo = TipoErro.REDE;
                mensagemUsuario = 'Erro de conexão. Verifique sua internet e tente novamente.';
                acoesSugeridas = [
                    'Verificar conexão com a internet',
                    'Tentar novamente em alguns segundos',
                    'Verificar se o serviço está disponível'
                ];
            }
            // Erros de autenticação
            else if (errorStr.includes('auth') ||
                errorStr.includes('unauthorized') ||
                errorStr.includes('unauthenticated')) {
                tipo = TipoErro.AUTENTICACAO;
                mensagemUsuario = 'Sessão expirada. Faça login novamente.';
                podeRetentar = false;
                acoesSugeridas = [
                    'Fazer login novamente',
                    'Verificar se a conta está ativa'
                ];
            }
            // Erros de permissão
            else if (errorStr.includes('permission') ||
                errorStr.includes('forbidden') ||
                errorStr.includes('access denied')) {
                tipo = TipoErro.PERMISSAO;
                mensagemUsuario = 'Você não tem permissão para realizar esta ação.';
                podeRetentar = false;
                acoesSugeridas = [
                    'Verificar permissões da conta',
                    'Entrar em contato com o administrador'
                ];
            }
            // Erros de validação
            else if (errorStr.includes('validation') ||
                errorStr.includes('invalid') ||
                errorStr.includes('bad request')) {
                tipo = TipoErro.VALIDACAO;
                mensagemUsuario = 'Dados inválidos. Verifique as informações e tente novamente.';
                podeRetentar = false;
                acoesSugeridas = [
                    'Verificar se todos os campos estão preenchidos corretamente',
                    'Verificar formato dos dados'
                ];
            }
            // Erros de servidor
            else if (errorStr.includes('server') ||
                errorStr.includes('internal') ||
                errorStr.includes('unavailable')) {
                tipo = TipoErro.SERVIDOR;
                mensagemUsuario = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
                acoesSugeridas = [
                    'Aguardar alguns minutos e tentar novamente',
                    'Verificar status do serviço'
                ];
            }
            // Erros de arquivo
            else if (errorStr.includes('file') ||
                errorStr.includes('json') ||
                errorStr.includes('parse')) {
                tipo = TipoErro.ARQUIVO;
                mensagemUsuario = 'Arquivo inválido ou corrompido.';
                podeRetentar = false;
                acoesSugeridas = [
                    'Verificar se o arquivo está correto',
                    'Tentar com outro arquivo',
                    'Verificar se o arquivo não está corrompido'
                ];
            }
            // Timeout
            else if (errorStr.includes('timeout')) {
                tipo = TipoErro.TIMEOUT;
                mensagemUsuario = 'Operação demorou muito para responder. Tente novamente.';
                acoesSugeridas = [
                    'Tentar novamente',
                    'Verificar conexão com a internet',
                    'Tentar com menos dados se possível'
                ];
            }
        }

        // Erros específicos do Firebase
        if (codigo) {
            switch (codigo) {
                case 'permission-denied':
                    tipo = TipoErro.PERMISSAO;
                    mensagemUsuario = 'Você não tem permissão para acessar estes dados.';
                    podeRetentar = false;
                    break;
                case 'unauthenticated':
                    tipo = TipoErro.AUTENTICACAO;
                    mensagemUsuario = 'Sessão expirada. Faça login novamente.';
                    podeRetentar = false;
                    break;
                case 'unavailable':
                    tipo = TipoErro.SERVIDOR;
                    mensagemUsuario = 'Serviço temporariamente indisponível.';
                    break;
                case 'not-found':
                    tipo = TipoErro.VALIDACAO;
                    mensagemUsuario = 'Dados não encontrados.';
                    podeRetentar = false;
                    break;
                case 'already-exists':
                    tipo = TipoErro.VALIDACAO;
                    mensagemUsuario = 'Dados já existem.';
                    podeRetentar = false;
                    break;
            }
        }

        const erroTratado: ErroTratado = {
            tipo,
            mensagemUsuario,
            mensagemTecnica,
            codigo,
            podeRetentar,
            acoesSugeridas
        };

        console.log('[INFO] Erro tratado:', erroTratado);

        return erroTratado;
    }

    /**
     * Exibe erro para o usuário
     */
    exibirErro(error: any, contexto?: string): void {
        const erroTratado = this.tratarErro(error);

        let mensagem = erroTratado.mensagemUsuario;
        if (contexto) {
            mensagem = `${contexto}: ${mensagem}`;
        }

        this.snackBar.open(mensagem, 'Fechar', {
            duration: 7000,
            panelClass: ['error-snackbar']
        });

        // Log detalhado no console
        console.error(`[ERRO${contexto ? ` - ${contexto}` : ''}]:`, {
            erro: error,
            tratado: erroTratado
        });
    }

    /**
     * Valida dados antes de operação
     */
    validarDados(dados: any, validacoes: { [campo: string]: (valor: any) => boolean | string }): string[] {
        const erros: string[] = [];

        Object.keys(validacoes).forEach(campo => {
            const valor = dados[campo];
            const validacao = validacoes[campo];
            const resultado = validacao(valor);

            if (resultado !== true) {
                const mensagem = typeof resultado === 'string' ? resultado : `Campo ${campo} é inválido`;
                erros.push(mensagem);
            }
        });

        return erros;
    }

    /**
     * Adiciona log de operação
     */
    private adicionarLog(log: LogOperacao): void {
        this.logs.unshift(log);

        // Manter apenas os últimos logs
        if (this.logs.length > this.MAX_LOGS) {
            this.logs = this.logs.slice(0, this.MAX_LOGS);
        }

        // Log no console para debug
        const nivel = log.status === 'erro' ? 'error' :
            log.status === 'retry' ? 'warn' : 'log';

        console[nivel](`[${log.status.toUpperCase()}] ${log.operacao}`, {
            id: log.id,
            timestamp: log.timestamp,
            detalhes: log.detalhes,
            erro: log.erro,
            tentativa: log.tentativa,
            tempoExecucao: log.tempoExecucao
        });
    }

    /**
     * Gera ID único para log
     */
    private gerarIdLog(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtém logs de operações
     */
    obterLogs(filtro?: { operacao?: string; status?: string; limite?: number }): LogOperacao[] {
        let logs = [...this.logs];

        if (filtro?.operacao) {
            logs = logs.filter(log => log.operacao.includes(filtro.operacao!));
        }

        if (filtro?.status) {
            logs = logs.filter(log => log.status === filtro.status);
        }

        if (filtro?.limite) {
            logs = logs.slice(0, filtro.limite);
        }

        return logs;
    }

    /**
     * Limpa logs antigos
     */
    limparLogs(): void {
        this.logs = [];
        console.log('[INFO] Logs de operações limpos');
    }

    /**
     * Exporta logs para análise
     */
    exportarLogs(): string {
        const dadosExport = {
            timestamp: new Date().toISOString(),
            totalLogs: this.logs.length,
            logs: this.logs
        };

        return JSON.stringify(dadosExport, null, 2);
    }

    /**
     * Obtém estatísticas dos logs
     */
    obterEstatisticasLogs(): {
        total: number;
        sucessos: number;
        erros: number;
        retries: number;
        operacoesMaisComuns: { [operacao: string]: number };
        errosMaisComuns: { [erro: string]: number };
    } {
        const stats = {
            total: this.logs.length,
            sucessos: 0,
            erros: 0,
            retries: 0,
            operacoesMaisComuns: {} as { [operacao: string]: number },
            errosMaisComuns: {} as { [erro: string]: number }
        };

        this.logs.forEach(log => {
            // Contar status
            if (log.status === 'sucesso') stats.sucessos++;
            else if (log.status === 'erro') stats.erros++;
            else if (log.status === 'retry') stats.retries++;

            // Contar operações
            stats.operacoesMaisComuns[log.operacao] =
                (stats.operacoesMaisComuns[log.operacao] || 0) + 1;

            // Contar erros
            if (log.erro) {
                stats.errosMaisComuns[log.erro] =
                    (stats.errosMaisComuns[log.erro] || 0) + 1;
            }
        });

        return stats;
    }
}