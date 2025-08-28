import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
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
import { ErrorHandlerService, RETRY_CONFIG_PADRAO } from './error-handler.service';

/**
 * Interface para dados completos de exportação de uma viagem
 */
export interface DadosExportacaoViagem {
    /** Metadados da exportação */
    metadados: {
        versao: string;
        dataExportacao: string;
        usuarioId: string;
        nomeUsuario?: string;
        aplicacao: string;
    };

    /** Dados da viagem principal */
    viagem: Viagem;

    /** Dias da viagem */
    dias: DiaViagem[];

    /** Paradas da viagem */
    paradas: Parada[];

    /** Hospedagens da viagem */
    hospedagens: Hospedagem[];

    /** Custos da viagem */
    custos: Custo[];

    /** Manutenções relacionadas */
    manutencoes: Manutencao[];

    /** Dados climáticos */
    clima: Clima[];

    /** Entradas do diário de bordo */
    diario: DiarioBordo[];

    /** Estatísticas calculadas */
    estatisticas: EstatisticasExportacao;
}

/**
 * Interface para estatísticas da exportação
 */
export interface EstatisticasExportacao {
    totalDias: number;
    totalParadas: number;
    totalHospedagens: number;
    totalCustos: number;
    valorTotalCustos: number;
    totalManutencoes: number;
    totalEntradasDiario: number;
    distanciaTotal: number;
    duracaoViagem: number;
}

/**
 * Interface para opções de exportação
 */
export interface OpcoesExportacao {
    incluirDias: boolean;
    incluirParadas: boolean;
    incluirHospedagens: boolean;
    incluirCustos: boolean;
    incluirManutencoes: boolean;
    incluirClima: boolean;
    incluirDiario: boolean;
    incluirFotos: boolean;
    formatoData: 'iso' | 'brasileiro';
    incluirMetadados: boolean;
}

/**
 * Opções padrão de exportação
 */
export const OPCOES_EXPORTACAO_PADRAO: OpcoesExportacao = {
    incluirDias: true,
    incluirParadas: true,
    incluirHospedagens: true,
    incluirCustos: true,
    incluirManutencoes: true,
    incluirClima: true,
    incluirDiario: true,
    incluirFotos: false, // Por padrão não inclui URLs de fotos
    formatoData: 'brasileiro',
    incluirMetadados: true
};

@Injectable({
    providedIn: 'root'
})
export class ExportacaoService {
    private readonly VERSAO_EXPORTACAO = '1.0.0';
    private readonly NOME_APLICACAO = 'Andes Trip Manager';

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
        private errorHandler: ErrorHandlerService
    ) { }

    /**
     * Exporta uma viagem completa com todos os dados relacionados
     */
    exportarViagemCompleta(
        viagemId: string,
        opcoes: OpcoesExportacao = OPCOES_EXPORTACAO_PADRAO
    ): Observable<DadosExportacaoViagem> {
        const nomeOperacao = `Exportar viagem ${viagemId}`;

        // Validar dados de entrada
        const errosValidacao = this.errorHandler.validarDados(
            { viagemId, opcoes },
            {
                viagemId: (valor) => typeof valor === 'string' && valor.length > 0 || 'ID da viagem é obrigatório',
                opcoes: (valor) => typeof valor === 'object' && valor !== null || 'Opções de exportação são obrigatórias'
            }
        );

        if (errosValidacao.length > 0) {
            return throwError(() => new Error('Dados inválidos: ' + errosValidacao.join(', ')));
        }

        const operacao = () => {
            console.log(`[INFO] Iniciando exportação da viagem ${viagemId}`);
            console.log(`[INFO] Opções de exportação:`, opcoes);

            const usuario = this.authService.getCurrentUser();
            if (!usuario?.id) {
                return throwError(() => new Error('Usuário não autenticado'));
            }

            return this.viagensService.recuperarPorId(viagemId).pipe(
                switchMap(viagem => {
                    if (!viagem) {
                        throw new Error('Viagem não encontrada');
                    }

                    if (viagem.usuarioId !== usuario.id) {
                        throw new Error('Você não tem permissão para exportar esta viagem');
                    }

                    console.log(`[INFO] Viagem encontrada: ${viagem.nome}`);

                    return this.coletarDadosExportacao(viagem, opcoes);
                }),
                map(dados => this.processarDadosExportacao(dados, opcoes)),
                tap(dadosFinais => {
                    console.log(`[SUCESSO] Exportação concluída para viagem ${viagemId}`);
                    console.log(`[INFO] Estatísticas da exportação:`, dadosFinais.estatisticas);
                })
            );
        };

        return this.errorHandler.executarComRetry(operacao, nomeOperacao, {
            ...RETRY_CONFIG_PADRAO,
            maxTentativas: 2 // Menos tentativas para exportação
        }).pipe(
            catchError(error => {
                this.errorHandler.exibirErro(error, 'Exportação de viagem');
                return throwError(() => this.tratarErroExportacao(error));
            })
        );
    }

    /**
     * Exporta múltiplas viagens do usuário
     */
    exportarMultiplasViagens(
        viagensIds: string[],
        opcoes: OpcoesExportacao = OPCOES_EXPORTACAO_PADRAO
    ): Observable<DadosExportacaoViagem[]> {
        console.log(`[INFO] Iniciando exportação de ${viagensIds.length} viagens`);

        if (viagensIds.length === 0) {
            return of([]);
        }

        const exportacoes = viagensIds.map(id =>
            this.exportarViagemCompleta(id, opcoes)
        );

        return forkJoin(exportacoes).pipe(
            tap(resultados => {
                console.log(`[SUCESSO] Exportação de múltiplas viagens concluída: ${resultados.length} viagens`);
            }),
            catchError(error => {
                console.error(`[ERRO] Falha na exportação de múltiplas viagens:`, error);
                return throwError(() => new Error('Erro ao exportar múltiplas viagens: ' + error.message));
            })
        );
    }

    /**
     * Exporta todas as viagens do usuário
     */
    exportarTodasViagens(
        opcoes: OpcoesExportacao = OPCOES_EXPORTACAO_PADRAO
    ): Observable<DadosExportacaoViagem[]> {
        console.log(`[INFO] Iniciando exportação de todas as viagens do usuário`);

        return this.viagensService.listarViagensUsuario().pipe(
            switchMap(viagens => {
                if (viagens.length === 0) {
                    console.log(`[INFO] Nenhuma viagem encontrada para exportar`);
                    return of([]);
                }

                console.log(`[INFO] Encontradas ${viagens.length} viagens para exportar`);

                const viagensIds = viagens.map(v => v.id!).filter(id => id);
                return this.exportarMultiplasViagens(viagensIds, opcoes);
            })
        );
    }

    /**
     * Gera arquivo JSON para download
     */
    gerarArquivoJSON(dados: DadosExportacaoViagem | DadosExportacaoViagem[]): void {
        try {
            const nomeArquivo = Array.isArray(dados)
                ? `viagens_export_${new Date().toISOString().split('T')[0]}.json`
                : `viagem_${dados.viagem.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;

            const conteudo = JSON.stringify(dados, null, 2);
            const blob = new Blob([conteudo], { type: 'application/json' });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

            console.log(`[SUCESSO] Arquivo ${nomeArquivo} gerado para download`);
        } catch (error) {
            console.error(`[ERRO] Falha ao gerar arquivo JSON:`, error);
            throw new Error('Erro ao gerar arquivo para download');
        }
    }

    /**
     * Valida dados de exportação
     */
    validarDadosExportacao(dados: DadosExportacaoViagem): { valido: boolean; erros: string[] } {
        const erros: string[] = [];

        // Validar metadados
        if (!dados.metadados) {
            erros.push('Metadados ausentes');
        } else {
            if (!dados.metadados.versao) erros.push('Versão dos metadados ausente');
            if (!dados.metadados.dataExportacao) erros.push('Data de exportação ausente');
            if (!dados.metadados.usuarioId) erros.push('ID do usuário ausente');
        }

        // Validar viagem principal
        if (!dados.viagem) {
            erros.push('Dados da viagem ausentes');
        } else {
            if (!dados.viagem.nome) erros.push('Nome da viagem ausente');
            if (!dados.viagem.dataInicio) erros.push('Data de início ausente');
            if (!dados.viagem.dataFim) erros.push('Data de fim ausente');
        }

        // Validar arrays (devem existir mesmo que vazios)
        const arrays = ['dias', 'paradas', 'hospedagens', 'custos', 'manutencoes', 'clima', 'diario'];
        arrays.forEach(array => {
            if (!Array.isArray(dados[array as keyof DadosExportacaoViagem])) {
                erros.push(`Array ${array} inválido ou ausente`);
            }
        });

        // Validar estatísticas
        if (!dados.estatisticas) {
            erros.push('Estatísticas ausentes');
        }

        const valido = erros.length === 0;

        if (valido) {
            console.log(`[SUCESSO] Dados de exportação válidos`);
        } else {
            console.error(`[ERRO] Dados de exportação inválidos:`, erros);
        }

        return { valido, erros };
    }

    /**
     * Coleta todos os dados relacionados à viagem
     */
    private coletarDadosExportacao(
        viagem: Viagem,
        opcoes: OpcoesExportacao
    ): Observable<any> {
        const viagemId = viagem.id!;

        const observables: { [key: string]: Observable<any> } = {
            viagem: of(viagem)
        };

        // Coletar dados conforme opções selecionadas
        if (opcoes.incluirDias) {
            observables.dias = this.diasViagemService.listarDiasViagem(viagemId);
        }

        if (opcoes.incluirParadas) {
            observables.paradas = this.paradasService.listarParadasViagem(viagemId);
        }

        if (opcoes.incluirHospedagens) {
            observables.hospedagens = this.hospedagensService.listarHospedagensViagem(viagemId);
        }

        if (opcoes.incluirCustos) {
            observables.custos = this.custosService.listarCustosViagem(viagemId);
        }

        if (opcoes.incluirManutencoes) {
            observables.manutencoes = this.manutencaoService.listarManutencoesPorViagem(viagemId);
        }

        if (opcoes.incluirClima) {
            observables.clima = this.climaService.listarClimaPorViagem(viagemId);
        }

        if (opcoes.incluirDiario) {
            observables.diario = this.diarioBordoService.listarPorViagem(viagemId);
        }

        return forkJoin(observables).pipe(
            map(resultados => ({
                viagem: resultados.viagem,
                dias: resultados.dias || [],
                paradas: resultados.paradas || [],
                hospedagens: resultados.hospedagens || [],
                custos: resultados.custos || [],
                manutencoes: resultados.manutencoes || [],
                clima: resultados.clima || [],
                diario: resultados.diario || []
            }))
        );
    }

    /**
     * Processa e formata os dados coletados
     */
    private processarDadosExportacao(
        dadosColetados: any,
        opcoes: OpcoesExportacao
    ): DadosExportacaoViagem {
        const usuario = this.authService.getCurrentUser();

        // Processar datas se necessário
        if (opcoes.formatoData === 'brasileiro') {
            dadosColetados = this.converterDatasParaFormatoBrasileiro(dadosColetados);
        }

        // Remover URLs de fotos se não solicitado
        if (!opcoes.incluirFotos) {
            dadosColetados = this.removerURLsFotos(dadosColetados);
        }

        // Calcular estatísticas
        const estatisticas = this.calcularEstatisticas(dadosColetados);

        // Montar dados finais
        const dadosExportacao: DadosExportacaoViagem = {
            metadados: {
                versao: this.VERSAO_EXPORTACAO,
                dataExportacao: new Date().toISOString(),
                usuarioId: usuario?.id || '',
                nomeUsuario: usuario?.nome,
                aplicacao: this.NOME_APLICACAO
            },
            viagem: dadosColetados.viagem,
            dias: dadosColetados.dias,
            paradas: dadosColetados.paradas,
            hospedagens: dadosColetados.hospedagens,
            custos: dadosColetados.custos,
            manutencoes: dadosColetados.manutencoes,
            clima: dadosColetados.clima,
            diario: dadosColetados.diario,
            estatisticas
        };

        return dadosExportacao;
    }

    /**
     * Calcula estatísticas dos dados exportados
     */
    private calcularEstatisticas(dados: any): EstatisticasExportacao {
        const estatisticas: EstatisticasExportacao = {
            totalDias: dados.dias?.length || 0,
            totalParadas: dados.paradas?.length || 0,
            totalHospedagens: dados.hospedagens?.length || 0,
            totalCustos: dados.custos?.length || 0,
            valorTotalCustos: dados.custos?.reduce((total: number, custo: Custo) => total + custo.valor, 0) || 0,
            totalManutencoes: dados.manutencoes?.length || 0,
            totalEntradasDiario: dados.diario?.length || 0,
            distanciaTotal: dados.viagem?.distanciaTotal || 0,
            duracaoViagem: 0
        };

        // Calcular duração da viagem em dias
        if (dados.viagem?.dataInicio && dados.viagem?.dataFim) {
            const inicio = new Date(dados.viagem.dataInicio);
            const fim = new Date(dados.viagem.dataFim);
            const diffTime = Math.abs(fim.getTime() - inicio.getTime());
            estatisticas.duracaoViagem = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return estatisticas;
    }

    /**
     * Converte datas para formato brasileiro
     */
    private converterDatasParaFormatoBrasileiro(dados: any): any {
        // Implementação simplificada - em produção seria mais robusta
        const dadosConvertidos = JSON.parse(JSON.stringify(dados));

        // Converter datas da viagem
        if (dadosConvertidos.viagem) {
            if (dadosConvertidos.viagem.dataInicio) {
                dadosConvertidos.viagem.dataInicio = this.formatarDataBrasileira(dadosConvertidos.viagem.dataInicio);
            }
            if (dadosConvertidos.viagem.dataFim) {
                dadosConvertidos.viagem.dataFim = this.formatarDataBrasileira(dadosConvertidos.viagem.dataFim);
            }
        }

        // Converter datas dos dias
        if (dadosConvertidos.dias) {
            dadosConvertidos.dias.forEach((dia: any) => {
                if (dia.data) {
                    dia.data = this.formatarDataBrasileira(dia.data);
                }
            });
        }

        return dadosConvertidos;
    }

    /**
     * Formata data para padrão brasileiro
     */
    private formatarDataBrasileira(dataISO: string): string {
        try {
            const data = new Date(dataISO);
            return data.toLocaleDateString('pt-BR');
        } catch {
            return dataISO; // Retorna original se não conseguir converter
        }
    }

    /**
     * Remove URLs de fotos dos dados
     */
    private removerURLsFotos(dados: any): any {
        const dadosSemFotos = JSON.parse(JSON.stringify(dados));

        // Remover fotos da viagem
        if (dadosSemFotos.viagem?.fotos) {
            delete dadosSemFotos.viagem.fotos;
        }

        // Remover fotos das paradas
        if (dadosSemFotos.paradas) {
            dadosSemFotos.paradas.forEach((parada: any) => {
                if (parada.fotos) {
                    delete parada.fotos;
                }
            });
        }

        // Remover fotos das hospedagens
        if (dadosSemFotos.hospedagens) {
            dadosSemFotos.hospedagens.forEach((hospedagem: any) => {
                if (hospedagem.fotos) {
                    delete hospedagem.fotos;
                }
            });
        }

        // Remover fotos do diário
        if (dadosSemFotos.diario) {
            dadosSemFotos.diario.forEach((entrada: any) => {
                if (entrada.fotos) {
                    delete entrada.fotos;
                }
            });
        }

        return dadosSemFotos;
    }

    /**
     * Trata erros de exportação com mensagens amigáveis
     */
    private tratarErroExportacao(error: any): Error {
        let mensagem = 'Erro desconhecido durante exportação';

        if (error instanceof Error) {
            if (error.message.includes('não encontrada')) {
                mensagem = 'Viagem não encontrada ou foi removida';
            } else if (error.message.includes('permissão')) {
                mensagem = 'Você não tem permissão para exportar esta viagem';
            } else if (error.message.includes('autenticado')) {
                mensagem = 'Sessão expirada. Faça login novamente';
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