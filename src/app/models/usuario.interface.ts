import { BaseEntity } from './base.interface';

/**
 * Interface para dados do usuário
 */
export interface Usuario extends BaseEntity {
    /** Email do usuário (usado para login) */
    email: string;

    /** Nome completo do usuário */
    nome: string;

    /** CPF do usuário */
    cpf?: string;

    /** Telefone de contato */
    telefone?: string;

    /** URL da foto de perfil */
    fotoUrl?: string;

    /** Dados da motocicleta do usuário */
    motocicleta?: DadosMotocicleta;

    /** Configurações de preferências do usuário */
    configuracoes?: ConfiguracoesUsuario;
}

/**
 * Interface para dados da motocicleta
 */
export interface DadosMotocicleta {
    /** Marca da motocicleta */
    marca: string;

    /** Modelo da motocicleta */
    modelo: string;

    /** Ano de fabricação */
    ano: number;

    /** Placa da motocicleta */
    placa?: string;

    /** Cor da motocicleta */
    cor?: string;

    /** Cilindrada do motor */
    cilindrada?: number;

    /** Capacidade do tanque em litros */
    capacidadeTanque?: number;

    /** Consumo médio em km/l */
    consumoMedio?: number;
}

/**
 * Interface para configurações do usuário
 */
export interface ConfiguracoesUsuario {
    /** Receber notificações de clima */
    notificacoesClima?: boolean;

    /** Receber lembretes de manutenção */
    lembreteManutencao?: boolean;

    /** Tema da aplicação (claro/escuro) */
    tema?: 'claro' | 'escuro';

    /** Unidade de distância preferida */
    unidadeDistancia?: 'km' | 'milhas';

    /** Moeda preferida para custos */
    moeda?: string;
}