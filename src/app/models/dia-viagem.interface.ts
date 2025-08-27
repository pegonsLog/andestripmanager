import { BaseEntity } from './base.interface';
import { CondicaoClimatica } from './enums';

/**
 * Interface para um dia específico da viagem
 */
export interface DiaViagem extends BaseEntity {
    /** ID da viagem à qual este dia pertence */
    viagemId: string;

    /** Data do dia (formato ISO string) */
    data: string;

    /** Número sequencial do dia na viagem (1, 2, 3...) */
    numeroDia: number;

    /** Cidade/local de origem do dia */
    origem: string;

    /** Cidade/local de destino do dia */
    destino: string;

    /** Distância planejada para o dia em km */
    distanciaPlanejada: number;

    /** Distância real percorrida em km */
    distanciaPercorrida?: number;

    /** Hora de partida planejada */
    horaPartidaPlanejada?: string;

    /** Hora de partida real */
    horaPartidaReal?: string;

    /** Hora de chegada planejada */
    horaChegadaPlanejada?: string;

    /** Hora de chegada real */
    horaChegadaReal?: string;

    /** Condição climática do dia */
    condicaoClimatica?: CondicaoClimatica;

    /** Temperatura mínima do dia em °C */
    temperaturaMin?: number;

    /** Temperatura máxima do dia em °C */
    temperaturaMax?: number;

    /** Observações específicas do dia */
    observacoes?: string;

    /** URLs das fotos do dia */
    fotos?: string[];

    /** Dados de rota do dia */
    rota?: DadosRota;

    /** Resumo do diário de bordo do dia */
    diarioBordo?: string;
}

/**
 * Interface para dados de rota de um dia
 */
export interface DadosRota {
    /** Coordenadas de origem [latitude, longitude] */
    coordenadasOrigemm?: [number, number];

    /** Coordenadas de destino [latitude, longitude] */
    coordenadasDestino?: [number, number];

    /** Pontos da rota (waypoints) */
    pontosRota?: PontoRota[];

    /** Tempo estimado de viagem em minutos */
    tempoEstimado?: number;

    /** Tempo real de viagem em minutos */
    tempoReal?: number;

    /** Tipo de estrada predominante */
    tipoEstrada?: 'urbana' | 'rodovia' | 'estrada-rural' | 'mista';
}

/**
 * Interface para um ponto específico da rota
 */
export interface PontoRota {
    /** Coordenadas do ponto [latitude, longitude] */
    coordenadas: [number, number];

    /** Nome/descrição do ponto */
    nome?: string;

    /** Tipo do ponto */
    tipo?: 'waypoint' | 'parada' | 'referencia';

    /** Ordem do ponto na rota */
    ordem: number;
}