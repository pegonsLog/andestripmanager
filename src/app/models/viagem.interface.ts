import { BaseEntity } from './base.interface';
import { StatusViagem } from './enums';

/**
 * Interface principal para uma viagem
 */
export interface Viagem extends BaseEntity {
    /** ID do usuário proprietário da viagem */
    usuarioId: string;

    /** Nome/título da viagem */
    nome: string;

    /** Descrição detalhada da viagem */
    descricao?: string;

    /** Data de início da viagem (formato ISO string) */
    dataInicio: string;

    /** Data de fim da viagem (formato ISO string) */
    dataFim: string;

    /** Status atual da viagem */
    status: StatusViagem;

    /** Cidade/local de origem */
    origem: string;

    /** Cidade/local de destino */
    destino: string;

    /** Distância total planejada em km */
    distanciaTotal?: number;

    /** Custo total estimado/real da viagem */
    custoTotal?: number;

    /** Número de dias da viagem */
    numeroDias?: number;

    /** URLs das fotos da viagem */
    fotos?: string[];

    /** Observações gerais da viagem */
    observacoes?: string;

    /** Dados de estatísticas da viagem */
    estatisticas?: EstatisticasViagem;
}

/**
 * Interface para estatísticas da viagem
 */
export interface EstatisticasViagem {
    /** Distância total percorrida */
    distanciaPercorrida?: number;

    /** Combustível total consumido em litros */
    combustivelConsumido?: number;

    /** Consumo médio da viagem em km/l */
    consumoMedio?: number;

    /** Velocidade média da viagem em km/h */
    velocidadeMedia?: number;

    /** Tempo total de viagem em horas */
    tempoTotal?: number;

    /** Número total de paradas */
    totalParadas?: number;

    /** Custo total real da viagem */
    custoTotalReal?: number;
}