import { BaseEntity } from './base.interface';
import { TipoManutencao } from './enums';

/**
 * Interface para controle de manutenções da motocicleta
 */
export interface Manutencao extends BaseEntity {
    /** ID da viagem (opcional, se manutenção durante viagem) */
    viagemId?: string;

    /** ID do usuário proprietário da moto */
    usuarioId: string;

    /** Tipo de manutenção */
    tipo: TipoManutencao;

    /** Descrição da manutenção */
    descricao: string;

    /** Data da manutenção */
    data: string;

    /** Quilometragem no momento da manutenção */
    quilometragem: number;

    /** Custo total da manutenção */
    custo: number;

    /** Local onde foi feita a manutenção */
    local?: string;

    /** Nome da oficina/mecânico */
    oficina?: string;

    /** Telefone da oficina */
    telefoneOficina?: string;

    /** Itens/serviços realizados */
    itensServicos: ItemManutencao[];

    /** Observações sobre a manutenção */
    observacoes?: string;

    /** URLs das fotos (antes/depois, notas fiscais) */
    fotos?: string[];

    /** Próxima manutenção recomendada em km */
    proximaManutencaoKm?: number;

    /** Data recomendada para próxima manutenção */
    proximaManutencaoData?: string;
}/**
 * I
nterface para itens específicos de manutenção
 */
export interface ItemManutencao {
    /** Nome do item/serviço */
    nome: string;

    /** Categoria do item */
    categoria: CategoriaManutencao;

    /** Custo individual do item */
    custo: number;

    /** Quantidade (se aplicável) */
    quantidade?: number;

    /** Marca/modelo da peça (se aplicável) */
    marca?: string;

    /** Observações específicas do item */
    observacoes?: string;
}

/**
 * Categorias de manutenção
 */
export enum CategoriaManutencao {
    MOTOR = 'motor',
    FREIOS = 'freios',
    SUSPENSAO = 'suspensao',
    PNEUS = 'pneus',
    ELETRICA = 'eletrica',
    TRANSMISSAO = 'transmissao',
    CARROCERIA = 'carroceria',
    OUTROS = 'outros'
}