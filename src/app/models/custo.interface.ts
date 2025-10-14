import { BaseEntity } from './base.interface';
import { CategoriaCusto } from './enums';

/**
 * Interface para controle de custos da viagem
 */
export interface Custo extends BaseEntity {
    /** ID do usuário proprietário do custo */
    usuarioId: string;

    /** ID da viagem */
    viagemId: string;

    /** ID do dia da viagem (opcional, para custos específicos de um dia) */
    diaViagemId?: string;

    /** ID da parada relacionada (opcional) */
    paradaId?: string;

    /** Categoria do custo */
    categoria: CategoriaCusto;

    /** Descrição do custo */
    descricao: string;

    /** Valor do custo em reais */
    valor: number;

    /** Data do custo */
    data: string;

    /** Hora do custo */
    hora?: string;

    /** Local onde foi feito o gasto */
    local?: string;

    /** Método de pagamento */
    metodoPagamento?: MetodoPagamento;

    /** Observações sobre o custo */
    observacoes?: string;

    /** URL da foto do comprovante */
    comprovanteUrl?: string;

    /** Indica se é um custo planejado ou real */
    tipo: 'planejado' | 'real';

    /** Moeda utilizada (padrão BRL) */
    moeda?: string;

    /** Taxa de câmbio (se aplicável) */
    taxaCambio?: number;

    /** Valor original em moeda estrangeira */
    valorOriginal?: number;
}

/**
 * Métodos de pagamento disponíveis
 */
export enum MetodoPagamento {
    DINHEIRO = 'dinheiro',
    CARTAO_CREDITO = 'cartao-credito',
    CARTAO_DEBITO = 'cartao-debito',
    PIX = 'pix',
    TRANSFERENCIA = 'transferencia',
    OUTROS = 'outros'
}

/**
 * Interface para resumo de custos por categoria
 */
export interface ResumoCustos {
    /** Categoria do custo */
    categoria: CategoriaCusto;

    /** Valor total da categoria */
    valorTotal: number;

    /** Número de itens na categoria */
    quantidade: number;

    /** Percentual do total geral */
    percentual: number;

    /** Valor médio por item */
    valorMedio: number;
}

/**
 * Interface para relatório de custos da viagem
 */
export interface RelatorioCustos {
    /** ID da viagem */
    viagemId: string;

    /** Valor total planejado */
    totalPlanejado: number;

    /** Valor total real */
    totalReal: number;

    /** Diferença entre planejado e real */
    diferenca: number;

    /** Percentual de variação */
    percentualVariacao: number;

    /** Resumo por categoria */
    resumoPorCategoria: ResumoCustos[];

    /** Custo médio por dia */
    custoMedioPorDia: number;

    /** Data de geração do relatório */
    dataGeracao: string;
}