import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Firestore, where, orderBy, QueryConstraint } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../core/services/base.service';
import { Viagem, StatusViagem } from '../models';
import { AuthService } from '../core/services/auth.service';
import { DiasViagemService } from './dias-viagem.service';
import { ParadasService } from './paradas.service';
import { HospedagensService } from './hospedagens.service';
import { CustosService } from './custos.service';
import { ManutencoesService } from './manutencoes.service';

@Injectable({
    providedIn: 'root'
})
export class ViagensService extends BaseFirestoreService<Viagem> {
    protected collectionName = 'viagens';

    constructor(
        firestore: Firestore,
        private authService: AuthService,
        private diasViagemService: DiasViagemService,
        private paradasService: ParadasService,
        private hospedagensService: HospedagensService,
        private custosService: CustosService,
        private manutencoesService: ManutencoesService
    ) {
        super(firestore);
    }

    /**
     * Lista viagens do usuário atual
     */
    listarViagensUsuario(): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            orderBy('dataInicio', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Lista viagens por status
     */
    listarPorStatus(status: StatusViagem): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            where('status', '==', status),
            orderBy('dataInicio', 'desc')
        ];

        return this.lista(constraints);
    }

    /**
     * Busca viagens por nome
     */
    buscarPorNome(nome: string): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        return this.listarViagensUsuario().pipe(
            map(viagens =>
                viagens.filter(viagem =>
                    viagem.nome.toLowerCase().includes(nome.toLowerCase())
                )
            )
        );
    }

    /**
     * Cria nova viagem para o usuário atual
     */
    async criarViagem(dadosViagem: Omit<Viagem, 'id' | 'usuarioId' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const viagem: Omit<Viagem, 'id' | 'criadoEm' | 'atualizadoEm'> = {
            ...dadosViagem,
            usuarioId: usuario.id,
            status: StatusViagem.PLANEJADA,
            numeroDias: this.calcularNumeroDias(dadosViagem.dataInicio, dadosViagem.dataFim)
        };

        return this.novo(viagem);
    }

    /**
     * Atualiza status da viagem
     */
    async atualizarStatus(id: string, status: StatusViagem): Promise<void> {
        await this.altera(id, { status });
    }

    /**
     * Calcula estatísticas da viagem
     */
    async calcularEstatisticas(viagemId: string): Promise<void> {
        // Aqui seria implementada a lógica para calcular estatísticas
        // baseada nos dias, paradas e custos da viagem
        console.log(`Calculando estatísticas para viagem ${viagemId}`);
    }

    /**
     * Calcula número de dias entre duas datas
     */
    private calcularNumeroDias(dataInicio: string, dataFim: string): number {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Obtém viagens recentes (últimas 5)
     */
    obterViagensRecentes(): Observable<Viagem[]> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        const constraints: QueryConstraint[] = [
            where('usuarioId', '==', usuario.id),
            orderBy('atualizadoEm', 'desc')
        ];

        return this.lista(constraints).pipe(
            map(viagens => viagens.slice(0, 5))
        );
    }

    /**
     * Obtém estatísticas detalhadas da viagem para confirmação de exclusão
     */
    async obterEstatisticasViagem(viagemId: string): Promise<{
        totalDias: number;
        totalParadas: number;
        totalHospedagens: number;
        totalCustos: number;
        valorTotalCustos: number;
        temDadosRelacionados: boolean;
    }> {
        try {
            console.log(`[INFO] Obtendo estatísticas da viagem ${viagemId}`);

            const [dias, paradas, hospedagens, custos] = await Promise.all([
                this.diasViagemService.listarDiasViagem(viagemId).toPromise(),
                this.paradasService.listarParadasViagem(viagemId).toPromise(),
                this.hospedagensService.listarHospedagensViagem(viagemId).toPromise(),
                this.custosService.listarCustosViagem(viagemId).toPromise()
            ]);

            const estatisticas = {
                totalDias: (dias || []).length,
                totalParadas: (paradas || []).length,
                totalHospedagens: (hospedagens || []).length,
                totalCustos: (custos || []).length,
                valorTotalCustos: (custos || []).reduce((total, custo) => total + custo.valor, 0),
                temDadosRelacionados: false
            };

            estatisticas.temDadosRelacionados =
                estatisticas.totalDias > 0 ||
                estatisticas.totalParadas > 0 ||
                estatisticas.totalHospedagens > 0 ||
                estatisticas.totalCustos > 0;

            console.log(`[INFO] Estatísticas da viagem ${viagemId}:`, estatisticas);

            return estatisticas;
        } catch (error) {
            console.error(`[ERRO] Falha ao obter estatísticas da viagem ${viagemId}:`, error);

            // Retorna estatísticas vazias em caso de erro
            return {
                totalDias: 0,
                totalParadas: 0,
                totalHospedagens: 0,
                totalCustos: 0,
                valorTotalCustos: 0,
                temDadosRelacionados: false
            };
        }
    }

    /**
     * Exclui viagem e todos os dados relacionados
     * Implementa rollback em caso de erro
     */
    async excluirViagemCompleta(viagemId: string): Promise<void> {
        const usuario = this.authService.getCurrentUser();
        if (!usuario?.id) {
            throw new Error('Usuário não autenticado');
        }

        console.log(`[INFO] Iniciando exclusão da viagem ${viagemId} para usuário ${usuario.id}`);

        // Verificar se a viagem pertence ao usuário
        const viagem = await this.recuperarPorId(viagemId).pipe(
            map(v => v)
        ).toPromise();

        if (!viagem) {
            console.error(`[ERRO] Viagem ${viagemId} não encontrada`);
            throw new Error('Viagem não encontrada');
        }

        if (viagem.usuarioId !== usuario.id) {
            console.error(`[ERRO] Usuário ${usuario.id} tentou excluir viagem ${viagemId} de outro usuário`);
            throw new Error('Você não tem permissão para excluir esta viagem');
        }

        console.log(`[INFO] Coletando dados para backup da viagem ${viagemId}`);

        // Coletar todos os dados relacionados antes da exclusão (para rollback)
        const dadosBackup = await this.coletarDadosParaBackup(viagemId);

        console.log(`[INFO] Backup coletado: ${dadosBackup.dias.length} dias, ${dadosBackup.paradas.length} paradas, ${dadosBackup.hospedagens.length} hospedagens, ${dadosBackup.custos.length} custos`);

        try {
            console.log(`[INFO] Iniciando exclusão de dados relacionados da viagem ${viagemId}`);

            // Excluir dados relacionados em ordem específica
            await this.excluirDadosRelacionados(viagemId);

            console.log(`[INFO] Dados relacionados excluídos, excluindo viagem ${viagemId}`);

            // Por último, excluir a viagem
            await this.remove(viagemId);

            console.log(`[SUCESSO] Viagem ${viagemId} e todos os dados relacionados foram excluídos com sucesso`);
        } catch (error) {
            console.error(`[ERRO] Falha durante exclusão da viagem ${viagemId}:`, error);

            try {
                console.log(`[INFO] Iniciando rollback para viagem ${viagemId}`);

                // Tentar restaurar os dados
                await this.restaurarDadosBackup(dadosBackup);

                console.log(`[SUCESSO] Rollback realizado com sucesso para viagem ${viagemId}`);
            } catch (rollbackError) {
                console.error(`[ERRO CRÍTICO] Falha no rollback da viagem ${viagemId}:`, rollbackError);
                throw new Error(
                    'Erro crítico durante exclusão. Alguns dados podem ter sido perdidos. ' +
                    'Entre em contato com o suporte técnico. ' +
                    `Código de erro: ${viagemId}-${Date.now()}`
                );
            }

            // Determinar tipo de erro e mensagem apropriada
            let mensagemErro = 'Erro desconhecido durante exclusão';

            if (error instanceof Error) {
                if (error.message.includes('permission-denied')) {
                    mensagemErro = 'Você não tem permissão para excluir esta viagem';
                } else if (error.message.includes('network')) {
                    mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente';
                } else if (error.message.includes('unavailable')) {
                    mensagemErro = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos';
                } else {
                    mensagemErro = error.message;
                }
            }

            // Re-lançar o erro original com mensagem amigável
            throw new Error(`Erro ao excluir viagem: ${mensagemErro}`);
        }
    }

    /**
     * Coleta todos os dados relacionados para backup (rollback)
     */
    private async coletarDadosParaBackup(viagemId: string): Promise<any> {
        try {
            console.log(`[INFO] Coletando dados relacionados para backup da viagem ${viagemId}`);

            // Para evitar necessidade de índices compostos, buscamos apenas por igualdade em viagemId (sem orderBy)
            const [viagem, dias, paradas, hospedagens, custos] = await Promise.all([
                this.recuperarPorId(viagemId).toPromise(),
                this.diasViagemService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.paradasService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.hospedagensService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.custosService.recuperarPorOutroParametro('viagemId', viagemId).toPromise()
            ]);

            const backup = {
                viagemId,
                timestamp: new Date().toISOString(),
                viagem,
                dias: dias || [],
                paradas: paradas || [],
                hospedagens: hospedagens || [],
                custos: custos || [],
                estatisticas: {
                    totalDias: (dias || []).length,
                    totalParadas: (paradas || []).length,
                    totalHospedagens: (hospedagens || []).length,
                    totalCustos: (custos || []).length,
                    valorTotalCustos: (custos || []).reduce((total, custo) => total + custo.valor, 0)
                }
            };

            console.log(`[INFO] Backup coletado com sucesso:`, backup.estatisticas);

            return backup;
        } catch (error) {
            console.error(`[ERRO] Falha ao coletar dados para backup da viagem ${viagemId}:`, error);

            let mensagemErro = 'Não foi possível preparar backup dos dados';

            if (error instanceof Error) {
                if (error.message.includes('permission-denied')) {
                    mensagemErro = 'Sem permissão para acessar dados da viagem';
                } else if (error.message.includes('not-found')) {
                    mensagemErro = 'Alguns dados da viagem não foram encontrados';
                } else if (error.message.includes('network')) {
                    mensagemErro = 'Erro de conexão ao preparar backup';
                }
            }

            throw new Error(mensagemErro);
        }
    }

    /**
     * Exclui todos os dados relacionados à viagem
     */
    private async excluirDadosRelacionados(viagemId: string): Promise<void> {
        const etapas = [
            { nome: 'custos', service: this.custosService },
            { nome: 'hospedagens', service: this.hospedagensService },
            { nome: 'paradas', service: this.paradasService },
            { nome: 'dias', service: this.diasViagemService }
        ];

        for (const etapa of etapas) {
            try {
                console.log(`[INFO] Excluindo ${etapa.nome} da viagem ${viagemId}`);

                // Evitar orderBy para não exigir índices compostos no Firestore durante exclusão
                const dados = await (etapa.service as any).recuperarPorOutroParametro('viagemId', viagemId).toPromise();

                if (dados && dados.length > 0) {
                    console.log(`[INFO] Encontrados ${dados.length} ${etapa.nome} para excluir`);

                    // Excluir em lotes para evitar sobrecarga
                    const loteSize = 10;
                    for (let i = 0; i < dados.length; i += loteSize) {
                        const lote = dados.slice(i, i + loteSize);

                        await Promise.all(lote.map(async (item: any) => {
                            if (item.id) {
                                try {
                                    await etapa.service.remove(item.id);
                                    console.log(`[INFO] ${etapa.nome.slice(0, -1)} ${item.id} excluído com sucesso`);
                                } catch (error) {
                                    console.error(`[ERRO] Falha ao excluir ${etapa.nome.slice(0, -1)} ${item.id}:`, error);
                                    throw error;
                                }
                            }
                        }));

                        // Pequena pausa entre lotes para não sobrecarregar o Firestore
                        if (i + loteSize < dados.length) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }

                    console.log(`[SUCESSO] Todos os ${dados.length} ${etapa.nome} foram excluídos`);
                } else {
                    console.log(`[INFO] Nenhum ${etapa.nome} encontrado para excluir`);
                }
            } catch (error) {
                console.error(`[ERRO] Falha ao excluir ${etapa.nome} da viagem ${viagemId}:`, error);
                throw new Error(`Erro ao excluir ${etapa.nome}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
        }

        console.log(`[SUCESSO] Todos os dados relacionados da viagem ${viagemId} foram excluídos`);
    }

    /**
     * Restaura dados do backup em caso de erro (rollback)
     */
    private async restaurarDadosBackup(backup: any): Promise<void> {
        try {
            console.log(`[INFO] Iniciando restauração do backup da viagem ${backup.viagemId}`);
            console.log(`[INFO] Dados para restaurar:`, backup.estatisticas);

            // 1. Restaurar viagem primeiro
            if (backup.viagem) {
                console.log(`[INFO] Restaurando viagem ${backup.viagemId}`);

                // Remover campos que não devem ser restaurados
                const viagemParaRestaurar = { ...backup.viagem };
                delete viagemParaRestaurar.id;
                delete viagemParaRestaurar.criadoEm;
                delete viagemParaRestaurar.atualizadoEm;

                await this.novo(viagemParaRestaurar);
                console.log(`[SUCESSO] Viagem ${backup.viagemId} restaurada`);
            }

            // 2. Restaurar dias de viagem
            if (backup.dias && backup.dias.length > 0) {
                console.log(`[INFO] Restaurando ${backup.dias.length} dias de viagem`);

                for (const dia of backup.dias) {
                    try {
                        const diaParaRestaurar = { ...dia };
                        delete diaParaRestaurar.id;
                        delete diaParaRestaurar.criadoEm;
                        delete diaParaRestaurar.atualizadoEm;

                        await this.diasViagemService.novo(diaParaRestaurar);
                    } catch (error) {
                        console.error(`[ERRO] Falha ao restaurar dia ${dia.id}:`, error);
                        // Continua tentando restaurar outros dias
                    }
                }

                console.log(`[SUCESSO] Dias de viagem restaurados`);
            }

            // 3. Restaurar paradas
            if (backup.paradas && backup.paradas.length > 0) {
                console.log(`[INFO] Restaurando ${backup.paradas.length} paradas`);

                for (const parada of backup.paradas) {
                    try {
                        const paradaParaRestaurar = { ...parada };
                        delete paradaParaRestaurar.id;
                        delete paradaParaRestaurar.criadoEm;
                        delete paradaParaRestaurar.atualizadoEm;

                        await this.paradasService.novo(paradaParaRestaurar);
                    } catch (error) {
                        console.error(`[ERRO] Falha ao restaurar parada ${parada.id}:`, error);
                        // Continua tentando restaurar outras paradas
                    }
                }

                console.log(`[SUCESSO] Paradas restauradas`);
            }

            // 4. Restaurar hospedagens
            if (backup.hospedagens && backup.hospedagens.length > 0) {
                console.log(`[INFO] Restaurando ${backup.hospedagens.length} hospedagens`);

                for (const hospedagem of backup.hospedagens) {
                    try {
                        const hospedagemParaRestaurar = { ...hospedagem };
                        delete hospedagemParaRestaurar.id;
                        delete hospedagemParaRestaurar.criadoEm;
                        delete hospedagemParaRestaurar.atualizadoEm;

                        await this.hospedagensService.novo(hospedagemParaRestaurar);
                    } catch (error) {
                        console.error(`[ERRO] Falha ao restaurar hospedagem ${hospedagem.id}:`, error);
                        // Continua tentando restaurar outras hospedagens
                    }
                }

                console.log(`[SUCESSO] Hospedagens restauradas`);
            }

            // 5. Restaurar custos
            if (backup.custos && backup.custos.length > 0) {
                console.log(`[INFO] Restaurando ${backup.custos.length} custos`);

                for (const custo of backup.custos) {
                    try {
                        const custoParaRestaurar = { ...custo };
                        delete custoParaRestaurar.id;
                        delete custoParaRestaurar.criadoEm;
                        delete custoParaRestaurar.atualizadoEm;

                        await this.custosService.novo(custoParaRestaurar);
                    } catch (error) {
                        console.error(`[ERRO] Falha ao restaurar custo ${custo.id}:`, error);
                        // Continua tentando restaurar outros custos
                    }
                }

                console.log(`[SUCESSO] Custos restaurados`);
            }

            console.log(`[SUCESSO] Rollback completo da viagem ${backup.viagemId} realizado com sucesso`);
        } catch (error) {
            console.error(`[ERRO CRÍTICO] Falha durante restauração do backup da viagem ${backup.viagemId}:`, error);
            throw new Error(`Falha crítica no rollback: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    /**
     * Recupera todos os dados completos de uma viagem para geração do álbum
     * Inclui: viagem, dias, paradas, hospedagens, custos, manutenções e fotos
     */
    async recuperarDadosCompletosViagem(viagemId: string): Promise<{
        viagem: Viagem | undefined;
        dias: any[];
        paradas: any[];
        hospedagens: any[];
        custos: any[];
        manutencoes: any[];
    }> {
        try {
            console.log(`[INFO] Recuperando dados completos da viagem ${viagemId} para álbum`);

            const [viagem, dias, paradas, hospedagens, custos, manutencoes] = await Promise.all([
                this.recuperarPorId(viagemId).toPromise(),
                this.diasViagemService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.paradasService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.hospedagensService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.custosService.recuperarPorOutroParametro('viagemId', viagemId).toPromise(),
                this.manutencoesService.recuperarPorViagem(viagemId).toPromise()
            ]);

            console.log(`[INFO] Dados recuperados: ${(dias || []).length} dias, ${(paradas || []).length} paradas, ${(hospedagens || []).length} hospedagens, ${(custos || []).length} custos, ${(manutencoes || []).length} manutenções`);

            return {
                viagem,
                dias: dias || [],
                paradas: paradas || [],
                hospedagens: hospedagens || [],
                custos: custos || [],
                manutencoes: manutencoes || []
            };
        } catch (error) {
            console.error(`[ERRO] Falha ao recuperar dados completos da viagem ${viagemId}:`, error);
            throw new Error(`Erro ao carregar dados da viagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }
}