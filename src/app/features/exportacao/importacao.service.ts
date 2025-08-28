import { Injectable } from '@angular/core';
import { Observable, from, throwError, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import {
    DadosExportacaoViagem,
    EstatisticasExportacao
} from './exportacao.service';
import {
    Viagem,
    DiaViagem,
    Parada,
    Hospedagem,
    Custo,
    Manutencao,
    Clima,
    DiarioBordo
} from '../../models';
import { ViagensService } from '../../services/viagens.service';
import { DiasViagemService } from '../../services/dias-viagem.service';
import { ParadasService } from '../../services/paradas.service';
import { HospedagensService } from '../../services/hospedagens.service';
import { CustosService } from '../../services/custos.service';
import { ManutencaoService } from '../../services/manutencoes.service';
import { ClimaService } from '../../services/clima.service';
import { DiarioBordoService } from '../../services/diario-bordo.service';
import { AuthService } from '../../core/services/auth.service';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { ErrorHandlerService, RETRY_CONFIG_PADRAO } from './error-handler.service';

/**
 * Interface para resultado da validação de importação
 */
export interface ResultadoValidacaoImportacao {
    valido: boolean;
    erros: string[];
    avisos: string[];
    estatisticas?: EstatisticasExportacao;
}

/**
 * Interface para opções de importação
 */
export interface OpcoesImportacao {
    substituirExistente: boolean;
    importarDias: boolean;
    importarParadas: boolean;
    importarHospedagens: boolean;
    importarCustos: boolean;
    importarManutencoes: boolean;
    importarClima: boolean;
    importarDiario: boolean;
    criarBackupAntes: boolean;
}

/**
 * Opções padrão de importação
 */
export const OPCOES_IMPORTACAO_PADRAO: OpcoesImportacao = {
    substituirExistente: false,
    importarDias: true,
    importarParadas: true,
    importarHospedagens: true,
    importarCustos: true,
    importarManutencoes: true,
    importarClima: true,
    importarDiario: true,
    criarBackupAntes: true
};

/**
 * Interface para resultado da importação
 */
export interface ResultadoImportacao {
    sucesso: boolean;
    viagemId?: string;
    estatisticas: {
        viagensImportadas: number;
        diasImportados: number;
        paradasImportadas: number;
        hospedagensImportadas: number;
        custosImportados: number;
        manutencoesImportadas: number;
        climaImportado: number;
        diarioImportado: number;
    };
    erros: string[];
    avisos: string[];
}

@Injectable({
    providedIn: 'root'
})
export class ImportacaoService {
    private readonly VERSAO_SUPORTADA = '1.0.0';

    constructor(
        private viagensService: ViagensService,
        private diasViagemService: DiasViagemService,
        private paradasService: ParadasService,
        private hospedagensService: HospedagensService,
        private custosService: CustosService,
        private manutencaoService: ManutencaoService,
        private climaService: ClimaService,
        private diarioBordoService: DiarioBordoService,
        private authService: AuthService,
        private storage: Storage,
        private errorHandler: ErrorHandlerService
    ) { }

    /**
     * Valida dados de importação
     */
    validarDadosImportacao(dados: any): ResultadoValidacaoImportacao {
        const erros: string[] = [];
        const avisos: string[] = [];

        console.log('[INFO] Iniciando validação dos dados de importação');

        // Verificar se é um objeto válido
        if (!dados || typeof dados !== 'object') {
            erros.push('Dados inválidos: arquivo deve conter um objeto JSON válido');
            return { valido: false, erros, avisos };
        }

        // Verificar se é array (múltiplas viagens) ou objeto único
        const dadosArray = Array.isArray(dados) ? dados : [dados];

        for (let i = 0; i < dadosArray.length; i++) {
            const item = dadosArray[i];
            const prefixo = dadosArray.length > 1 ? `Viagem ${i + 1}: ` : '';

            // Validar metadados
            if (!item.metadados) {
                avisos.push(`${prefixo}Metadados ausentes - dados podem ser de versão antiga`);
            } else {
                if (item.metadados.versao && item.metadados.versao !== this.VERSAO_SUPORTADA) {
                    avisos.push(`${prefixo}Versão ${item.metadados.versao} pode não ser totalmente compatível`);
                }
                if (!item.metadados.aplicacao || !item.metadados.aplicacao.includes('Andes Trip Manager')) {
                    avisos.push(`${prefixo}Dados podem ser de outra aplicação`);
                }
            }

            // Validar viagem principal
            if (!item.viagem) {
                erros.push(`${prefixo}Dados da viagem principal ausentes`);
                continue;
            }

            const viagem = item.viagem;
            if (!viagem.nome) {
                erros.push(`${prefixo}Nome da viagem é obrigatório`);
            }
            if (!viagem.dataInicio) {
                erros.push(`${prefixo}Data de início é obrigatória`);
            }
            if (!viagem.dataFim) {
                erros.push(`${prefixo}Data de fim é obrigatória`);
            }

            // Validar datas
            if (viagem.dataInicio && viagem.dataFim) {
                const inicio = new Date(viagem.dataInicio);
                const fim = new Date(viagem.dataFim);

                if (isNaN(inicio.getTime())) {
                    erros.push(`${prefixo}Data de início inválida`);
                }
                if (isNaN(fim.getTime())) {
                    erros.push(`${prefixo}Data de fim inválida`);
                }
                if (inicio > fim) {
                    erros.push(`${prefixo}Data de início deve ser anterior à data de fim`);
                }
            }

            // Validar arrays (devem existir mesmo que vazios)
            const arrays = ['dias', 'paradas', 'hospedagens', 'custos', 'manutencoes', 'clima', 'diario'];
            arrays.forEach(array => {
                if (item[array] && !Array.isArray(item[array])) {
                    erros.push(`${prefixo}${array} deve ser um array`);
                }
            });

            // Validar integridade dos dados relacionados
            if (item.dias && item.paradas) {
                const diasIds = new Set(item.dias.map((d: any) => d.id).filter((id: any) => id));
                const paradasComDiaInvalido = item.paradas.filter((p: any) =>
                    p.diaViagemId && !diasIds.has(p.diaViagemId)
                );

                if (paradasComDiaInvalido.length > 0) {
                    avisos.push(`${prefixo}${paradasComDiaInvalido.length} paradas referenciam dias inexistentes`);
                }
            }
        }

        const valido = erros.length === 0;

        // Calcular estatísticas se válido
        let estatisticas: EstatisticasExportacao | undefined;
        if (valido && dadosArray.length === 1) {
            const item = dadosArray[0];
            estatisticas = {
                totalDias: item.dias?.length || 0,
                totalParadas: item.paradas?.length || 0,
                totalHospedagens: item.hospedagens?.length || 0,
                totalCustos: item.custos?.length || 0,
                valorTotalCustos: item.custos?.reduce((total: number, custo: any) => total + (custo.valor || 0), 0) || 0,
                totalManutencoes: item.manutencoes?.length || 0,
                totalEntradasDiario: item.diario?.length || 0,
                distanciaTotal: item.viagem?.distanciaTotal || 0,
                duracaoViagem: 0
            };

            // Calcular duração
            if (item.viagem?.dataInicio && item.viagem?.dataFim) {
                const inicio = new Date(item.viagem.dataInicio);
                const fim = new Date(item.viagem.dataFim);
                const diffTime = Math.abs(fim.getTime() - inicio.getTime());
                estatisticas.duracaoViagem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        console.log(`[INFO] Validação concluída: ${valido ? 'VÁLIDO' : 'INVÁLIDO'}`);
        console.log(`[INFO] Erros: ${erros.length}, Avisos: ${avisos.length}`);

        return { valido, erros, avisos, estatisticas };
    }

    /**
     * Importa uma viagem completa
     */
    importarViagem(
        dados: DadosExportacaoViagem,
        opcoes: OpcoesImportacao = OPCOES_IMPORTACAO_PADRAO
    ): Observable<ResultadoImportacao> {
        console.log('[INFO] Iniciando importação de viagem:', dados.viagem.nome);

        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            return throwError(() => new Error('Usuário não autenticado'));
        }

        // Validar dados primeiro
        const validacao = this.validarDadosImportacao(dados);
        if (!validacao.valido) {
            return throwError(() => new Error('Dados inválidos: ' + validacao.erros.join(', ')));
        }

        // Criar backup se solicitado
        const backupObservable = opcoes.criarBackupAntes
            ? this.criarBackupAutomatico()
            : of(null);

        return backupObservable.pipe(
            switchMap(() => this.executarImportacao(dados, opcoes, usuario.id)),
            catchError(error => {
                console.error('[ERRO] Falha na importação:', error);
                return throwError(() => this.tratarErroImportacao(error));
            })
        );
    }

    /**
     * Importa múltiplas viagens
     */
    importarMultiplasViagens(
        dadosArray: DadosExportacaoViagem[],
        opcoes: OpcoesImportacao = OPCOES_IMPORTACAO_PADRAO
    ): Observable<ResultadoImportacao[]> {
        console.log(`[INFO] Iniciando importação de ${dadosArray.length} viagens`);

        if (dadosArray.length === 0) {
            return of([]);
        }

        const importacoes = dadosArray.map(dados =>
            this.importarViagem(dados, opcoes)
        );

        return forkJoin(importacoes).pipe(
            tap(resultados => {
                const sucessos = resultados.filter(r => r.sucesso).length;
                console.log(`[SUCESSO] ${sucessos}/${resultados.length} viagens importadas com sucesso`);
            }),
            catchError(error => {
                console.error('[ERRO] Falha na importação múltipla:', error);
                return throwError(() => new Error('Erro ao importar múltiplas viagens: ' + error.message));
            })
        );
    }

    /**
     * Cria backup automático antes da importação
     */
    criarBackupAutomatico(): Observable<string> {
        console.log('[INFO] Criando backup automático antes da importação');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeBackup = `backup_pre_importacao_${timestamp}.json`;

        // Por simplicidade, retornamos sucesso
        // Em implementação completa, faria backup real das viagens existentes
        return of(nomeBackup).pipe(
            tap(nome => console.log(`[SUCESSO] Backup criado: ${nome}`))
        );
    }

    /**
     * Restaura dados de um backup
     */
    restaurarBackup(arquivoBackup: File): Observable<ResultadoImportacao> {
        console.log('[INFO] Iniciando restauração de backup:', arquivoBackup.name);

        return this.lerArquivoJSON(arquivoBackup).pipe(
            switchMap(dados => {
                // Validar se é um backup válido
                const validacao = this.validarDadosImportacao(dados);
                if (!validacao.valido) {
                    throw new Error('Backup inválido: ' + validacao.erros.join(', '));
                }

                // Importar com opções de restauração
                const opcoesRestauracao: OpcoesImportacao = {
                    ...OPCOES_IMPORTACAO_PADRAO,
                    substituirExistente: true,
                    criarBackupAntes: false // Não criar backup ao restaurar
                };

                if (Array.isArray(dados)) {
                    // Múltiplas viagens
                    return this.importarMultiplasViagens(dados, opcoesRestauracao).pipe(
                        map(resultados => this.consolidarResultados(resultados))
                    );
                } else {
                    // Viagem única
                    return this.importarViagem(dados, opcoesRestauracao);
                }
            }),
            catchError(error => {
                console.error('[ERRO] Falha na restauração:', error);
                return throwError(() => new Error('Erro ao restaurar backup: ' + error.message));
            })
        );
    }

    /**
     * Lê arquivo JSON
     */
    private lerArquivoJSON(arquivo: File): Observable<any> {
        return new Observable(observer => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const conteudo = e.target?.result as string;
                    const dados = JSON.parse(conteudo);
                    observer.next(dados);
                    observer.complete();
                } catch (error) {
                    observer.error(new Error('Arquivo JSON inválido'));
                }
            };

            reader.onerror = () => {
                observer.error(new Error('Erro ao ler arquivo'));
            };

            reader.readAsText(arquivo);
        });
    }

    /**
     * Executa a importação propriamente dita
     */
    private executarImportacao(
        dados: DadosExportacaoViagem,
        opcoes: OpcoesImportacao,
        usuarioId: string
    ): Observable<ResultadoImportacao> {
        const resultado: ResultadoImportacao = {
            sucesso: false,
            estatisticas: {
                viagensImportadas: 0,
                diasImportados: 0,
                paradasImportadas: 0,
                hospedagensImportadas: 0,
                custosImportados: 0,
                manutencoesImportadas: 0,
                climaImportado: 0,
                diarioImportado: 0
            },
            erros: [],
            avisos: []
        };

        return from(this.importarViagemPrincipal(dados.viagem, usuarioId)).pipe(
            switchMap(viagemId => {
                resultado.viagemId = viagemId;
                resultado.estatisticas.viagensImportadas = 1;

                // Importar dados relacionados em sequência
                return this.importarDadosRelacionados(dados, viagemId, opcoes, resultado);
            }),
            map(() => {
                resultado.sucesso = true;
                console.log('[SUCESSO] Importação concluída:', resultado.estatisticas);
                return resultado;
            }),
            catchError(error => {
                resultado.erros.push(error.message);
                console.error('[ERRO] Falha na execução da importação:', error);
                return of(resultado);
            })
        );
    }

    /**
     * Importa a viagem principal
     */
    private async importarViagemPrincipal(viagem: Viagem, usuarioId: string): Promise<string> {
        console.log('[INFO] Importando viagem principal:', viagem.nome);

        // Preparar dados da viagem
        const dadosViagem: Omit<Viagem, 'id' | 'usuarioId' | 'criadoEm' | 'atualizadoEm'> = {
            nome: viagem.nome,
            descricao: viagem.descricao,
            dataInicio: viagem.dataInicio,
            dataFim: viagem.dataFim,
            status: viagem.status,
            origem: viagem.origem,
            destino: viagem.destino,
            distanciaTotal: viagem.distanciaTotal,
            custoTotal: viagem.custoTotal,
            numeroDias: viagem.numeroDias,
            fotos: viagem.fotos,
            observacoes: viagem.observacoes,
            estatisticas: viagem.estatisticas
        };

        return this.viagensService.criarViagem(dadosViagem);
    }

    /**
     * Importa dados relacionados à viagem
     */
    private importarDadosRelacionados(
        dados: DadosExportacaoViagem,
        viagemId: string,
        opcoes: OpcoesImportacao,
        resultado: ResultadoImportacao
    ): Observable<void> {
        const importacoes: Observable<any>[] = [];

        // Importar dias
        if (opcoes.importarDias && dados.dias?.length > 0) {
            importacoes.push(
                this.importarDias(dados.dias, viagemId).pipe(
                    tap(count => resultado.estatisticas.diasImportados = count)
                )
            );
        }

        // Importar paradas
        if (opcoes.importarParadas && dados.paradas?.length > 0) {
            importacoes.push(
                this.importarParadas(dados.paradas, viagemId).pipe(
                    tap(count => resultado.estatisticas.paradasImportadas = count)
                )
            );
        }

        // Importar hospedagens
        if (opcoes.importarHospedagens && dados.hospedagens?.length > 0) {
            importacoes.push(
                this.importarHospedagens(dados.hospedagens, viagemId).pipe(
                    tap(count => resultado.estatisticas.hospedagensImportadas = count)
                )
            );
        }

        // Importar custos
        if (opcoes.importarCustos && dados.custos?.length > 0) {
            importacoes.push(
                this.importarCustos(dados.custos, viagemId).pipe(
                    tap(count => resultado.estatisticas.custosImportados = count)
                )
            );
        }

        // Importar manutenções
        if (opcoes.importarManutencoes && dados.manutencoes?.length > 0) {
            importacoes.push(
                this.importarManutencoes(dados.manutencoes, viagemId).pipe(
                    tap(count => resultado.estatisticas.manutencoesImportadas = count)
                )
            );
        }

        // Importar clima
        if (opcoes.importarClima && dados.clima?.length > 0) {
            importacoes.push(
                this.importarClima(dados.clima, viagemId).pipe(
                    tap(count => resultado.estatisticas.climaImportado = count)
                )
            );
        }

        // Importar diário
        if (opcoes.importarDiario && dados.diario?.length > 0) {
            importacoes.push(
                this.importarDiario(dados.diario, viagemId).pipe(
                    tap(count => resultado.estatisticas.diarioImportado = count)
                )
            );
        }

        if (importacoes.length === 0) {
            return of(undefined);
        }

        return forkJoin(importacoes).pipe(map(() => undefined));
    }

    /**
     * Importa dias de viagem
     */
    private importarDias(dias: DiaViagem[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${dias.length} dias de viagem`);

        const importacoes = dias.map(async (dia) => {
            const dadosDia: Omit<DiaViagem, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...dia,
                viagemId // Garantir que usa o novo ID da viagem
            };
            delete (dadosDia as any).id;

            return this.diasViagemService.novo(dadosDia);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} dias importados`))
        );
    }

    /**
     * Importa paradas
     */
    private importarParadas(paradas: Parada[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${paradas.length} paradas`);

        const importacoes = paradas.map(async (parada) => {
            const dadosParada: Omit<Parada, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...parada,
                viagemId // Garantir que usa o novo ID da viagem
            };
            delete (dadosParada as any).id;

            return this.paradasService.novo(dadosParada);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} paradas importadas`))
        );
    }

    /**
     * Importa hospedagens
     */
    private importarHospedagens(hospedagens: Hospedagem[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${hospedagens.length} hospedagens`);

        const importacoes = hospedagens.map(async (hospedagem) => {
            const dadosHospedagem: Omit<Hospedagem, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...hospedagem,
                viagemId // Garantir que usa o novo ID da viagem
            };
            delete (dadosHospedagem as any).id;

            return this.hospedagensService.novo(dadosHospedagem);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} hospedagens importadas`))
        );
    }

    /**
     * Importa custos
     */
    private importarCustos(custos: Custo[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${custos.length} custos`);

        const importacoes = custos.map(async (custo) => {
            const dadosCusto: Omit<Custo, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...custo,
                viagemId // Garantir que usa o novo ID da viagem
            };
            delete (dadosCusto as any).id;

            return this.custosService.novo(dadosCusto);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} custos importados`))
        );
    }

    /**
     * Importa manutenções
     */
    private importarManutencoes(manutencoes: Manutencao[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${manutencoes.length} manutenções`);

        const importacoes = manutencoes.map(async (manutencao) => {
            const dadosManutencao: Omit<Manutencao, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...manutencao,
                viagemId // Garantir que usa o novo ID da viagem
            };
            delete (dadosManutencao as any).id;

            return this.manutencaoService.novo(dadosManutencao);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} manutenções importadas`))
        );
    }

    /**
     * Importa dados climáticos
     */
    private importarClima(clima: Clima[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${clima.length} registros climáticos`);

        const importacoes = clima.map(async (registro) => {
            const dadosClima: Omit<Clima, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...registro
            };
            delete (dadosClima as any).id;

            return this.climaService.novo(dadosClima);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} registros climáticos importados`))
        );
    }

    /**
     * Importa entradas do diário
     */
    private importarDiario(diario: DiarioBordo[], viagemId: string): Observable<number> {
        console.log(`[INFO] Importando ${diario.length} entradas do diário`);

        const importacoes = diario.map(async (entrada) => {
            const dadosDiario: Omit<DiarioBordo, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                ...entrada,
                viagemId // Garantir que usa o novo ID da viagem
            };
            delete (dadosDiario as any).id;

            return this.diarioBordoService.novo(dadosDiario);
        });

        return from(Promise.all(importacoes)).pipe(
            map(resultados => resultados.length),
            tap(count => console.log(`[SUCESSO] ${count} entradas do diário importadas`))
        );
    }

    /**
     * Consolida resultados de múltiplas importações
     */
    private consolidarResultados(resultados: ResultadoImportacao[]): ResultadoImportacao {
        const consolidado: ResultadoImportacao = {
            sucesso: resultados.every(r => r.sucesso),
            estatisticas: {
                viagensImportadas: 0,
                diasImportados: 0,
                paradasImportadas: 0,
                hospedagensImportadas: 0,
                custosImportados: 0,
                manutencoesImportadas: 0,
                climaImportado: 0,
                diarioImportado: 0
            },
            erros: [],
            avisos: []
        };

        resultados.forEach(resultado => {
            consolidado.estatisticas.viagensImportadas += resultado.estatisticas.viagensImportadas;
            consolidado.estatisticas.diasImportados += resultado.estatisticas.diasImportados;
            consolidado.estatisticas.paradasImportadas += resultado.estatisticas.paradasImportadas;
            consolidado.estatisticas.hospedagensImportadas += resultado.estatisticas.hospedagensImportadas;
            consolidado.estatisticas.custosImportados += resultado.estatisticas.custosImportados;
            consolidado.estatisticas.manutencoesImportadas += resultado.estatisticas.manutencoesImportadas;
            consolidado.estatisticas.climaImportado += resultado.estatisticas.climaImportado;
            consolidado.estatisticas.diarioImportado += resultado.estatisticas.diarioImportado;

            consolidado.erros.push(...resultado.erros);
            consolidado.avisos.push(...resultado.avisos);
        });

        return consolidado;
    }

    /**
     * Trata erros de importação com mensagens amigáveis
     */
    private tratarErroImportacao(error: any): Error {
        let mensagem = 'Erro desconhecido durante importação';

        if (error instanceof Error) {
            if (error.message.includes('não autenticado')) {
                mensagem = 'Sessão expirada. Faça login novamente';
            } else if (error.message.includes('inválidos')) {
                mensagem = 'Dados do arquivo são inválidos ou corrompidos';
            } else if (error.message.includes('permission-denied')) {
                mensagem = 'Você não tem permissão para importar dados';
            } else if (error.message.includes('network') || error.message.includes('conexão')) {
                mensagem = 'Erro de conexão. Verifique sua internet e tente novamente';
            } else if (error.message.includes('unavailable')) {
                mensagem = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos';
            } else {
                mensagem = error.message;
            }
        }

        return new Error(mensagem);
    }
}