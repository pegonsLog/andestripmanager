import { BaseEntity } from './base.interface';

/**
 * Interface para dados de hospedagem
 */
export interface Hospedagem extends BaseEntity {
    /** ID do dia da viagem */
    diaViagemId: string;

    /** ID da viagem */
    viagemId: string;

    /** Nome do estabelecimento */
    nome: string;

    /** Tipo de hospedagem */
    tipo: TipoHospedagem;

    /** Endereço completo */
    endereco: string;

    /** Coordenadas [latitude, longitude] */
    coordenadas?: [number, number];

    /** Data de check-in */
    dataCheckIn: string;

    /** Data de check-out */
    dataCheckOut: string;

    /** Hora de check-in */
    horaCheckIn?: string;

    /** Hora de check-out */
    horaCheckOut?: string;

    /** Número de noites */
    numeroNoites: number;

    /** Valor da diária */
    valorDiaria: number;

    /** Valor total da hospedagem */
    valorTotal: number;

    /** Possui estacionamento coberto para moto */
    estacionamentoCoberto: boolean;

    /** Link da reserva */
    linkReserva?: string;

    /** Telefone de contato */
    telefone?: string;

    /** Email de contato */
    email?: string;

    /** Site oficial */
    siteOficial?: string;

    /** Avaliação geral (1-5 estrelas) */
    avaliacao?: number;

    /** Comodidades disponíveis */
    comodidades?: string[];

    /** Observações sobre a hospedagem */
    observacoes?: string;

    /** URLs das fotos da hospedagem */
    fotos?: string[];

    /** Avaliações detalhadas */
    avaliacaoDetalhada?: AvaliacaoHospedagem;
}

/**
 * Tipos de hospedagem disponíveis
 */
export enum TipoHospedagem {
    HOTEL = 'hotel',
    POUSADA = 'pousada',
    HOSTEL = 'hostel',
    CAMPING = 'camping',
    CASA_TEMPORADA = 'casa-temporada',
    APARTAMENTO = 'apartamento',
    OUTROS = 'outros'
}

/**
 * Interface para avaliação detalhada da hospedagem
 */
export interface AvaliacaoHospedagem {
    /** Qualidade do quarto (1-5) */
    qualidadeQuarto?: number;

    /** Qualidade do atendimento (1-5) */
    qualidadeAtendimento?: number;

    /** Limpeza (1-5) */
    limpeza?: number;

    /** Localização (1-5) */
    localizacao?: number;

    /** Custo-benefício (1-5) */
    custoBeneficio?: number;

    /** Segurança (1-5) */
    seguranca?: number;

    /** Café da manhã (1-5) */
    cafeManha?: number;

    /** Wi-Fi (1-5) */
    wifi?: number;

    /** Comentários adicionais */
    comentarios?: string;
}