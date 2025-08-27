import { BaseEntity } from './base.interface';
import { TipoParada, TipoCombustivel } from './enums';

/**
 * Interface base para uma parada durante a viagem
 */
export interface Parada extends BaseEntity {
    /** ID do dia da viagem */
    diaViagemId: string;

    /** ID da viagem */
    viagemId: string;

    /** Tipo da parada */
    tipo: TipoParada;

    /** Nome/descrição da parada */
    nome: string;

    /** Endereço da parada */
    endereco?: string;

    /** Coordenadas da parada [latitude, longitude] */
    coordenadas?: [number, number];

    /** Hora de chegada na parada */
    horaChegada?: string;

    /** Hora de saída da parada */
    horaSaida?: string;

    /** Duração da parada em minutos */
    duracao?: number;

    /** Custo total da parada */
    custo?: number;

    /** Observações sobre a parada */
    observacoes?: string;

    /** URLs das fotos da parada */
    fotos?: string[];

    /** Avaliação da parada (1-5 estrelas) */
    avaliacao?: number;

    /** Dados específicos baseados no tipo de parada */
    dadosEspecificos?: DadosAbastecimento | DadosRefeicao | DadosPontoInteresse;
}

/**
 * Interface para dados específicos de abastecimento
 */
export interface DadosAbastecimento {
    /** Tipo de combustível */
    tipoCombustivel: TipoCombustivel;

    /** Quantidade abastecida em litros */
    quantidade: number;

    /** Preço por litro */
    precoPorLitro: number;

    /** Valor total do abastecimento */
    valorTotal: number;

    /** Quilometragem no momento do abastecimento */
    quilometragem?: number;

    /** Nome do posto de combustível */
    nomePosto?: string;

    /** Bandeira do posto */
    bandeiraPosto?: string;
}

/**
 * Interface para dados específicos de refeição
 */
export interface DadosRefeicao {
    /** Tipo de refeição */
    tipoRefeicao: 'cafe-manha' | 'almoco' | 'jantar' | 'lanche';

    /** Nome do estabelecimento */
    nomeEstabelecimento?: string;

    /** Tipo de estabelecimento */
    tipoEstabelecimento?: 'restaurante' | 'lanchonete' | 'padaria' | 'fast-food' | 'outros';

    /** Valor gasto na refeição */
    valorGasto?: number;

    /** Número de pessoas */
    numeroPessoas?: number;

    /** Pratos consumidos */
    pratos?: string[];

    /** Qualidade da comida (1-5) */
    qualidadeComida?: number;

    /** Qualidade do atendimento (1-5) */
    qualidadeAtendimento?: number;
}

/**
 * Interface para dados específicos de ponto de interesse
 */
export interface DadosPontoInteresse {
    /** Categoria do ponto de interesse */
    categoria: 'turistico' | 'historico' | 'natural' | 'cultural' | 'religioso' | 'comercial' | 'outros';

    /** Valor da entrada/ingresso */
    valorEntrada?: number;

    /** Tempo de visita em minutos */
    tempoVisita?: number;

    /** Horário de funcionamento */
    horarioFuncionamento?: string;

    /** Site oficial */
    siteOficial?: string;

    /** Telefone de contato */
    telefone?: string;

    /** Recomendações */
    recomendacoes?: string[];

    /** Melhor época para visitar */
    melhorEpoca?: string;
}