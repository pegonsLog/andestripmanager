import { BaseEntity } from './base.interface';

/**
 * Interface para entrada do diário de bordo
 * Representa uma entrada de diário associada a uma viagem ou dia específico
 */
export interface DiarioBordo extends BaseEntity {
    /** ID da viagem associada */
    viagemId: string;

    /** ID do dia da viagem (opcional - pode ser uma entrada geral da viagem) */
    diaViagemId?: string;

    /** ID do usuário proprietário */
    usuarioId: string;

    /** Data da entrada do diário */
    data: string;

    /** Título da entrada (opcional) */
    titulo?: string;

    /** Conteúdo da entrada em formato HTML */
    conteudo: string;

    /** URLs das fotos associadas à entrada */
    fotos?: string[];

    /** Indica se a entrada é pública (para compartilhamento) */
    publico: boolean;

    /** Tags para categorização da entrada */
    tags?: string[];

    /** Localização onde a entrada foi criada */
    localizacao?: {
        latitude: number;
        longitude: number;
        endereco?: string;
    };

    /** Condições climáticas no momento da entrada */
    clima?: {
        temperatura?: number;
        condicao?: string;
        descricao?: string;
    };
}

/**
 * Interface para dados de criação/edição do diário
 */
export interface DiarioBordoForm {
    titulo?: string;
    conteudo: string;
    publico: boolean;
    tags?: string[];
    fotos?: File[];
}

/**
 * Interface para filtros de busca no diário
 */
export interface DiarioBordoFiltros {
    viagemId?: string;
    diaViagemId?: string;
    dataInicio?: string;
    dataFim?: string;
    tags?: string[];
    publico?: boolean;
    temFotos?: boolean;
}