/**
 * Tipos e interfaces do AndesTripManager para o servidor MCP
 */

export interface BaseEntity {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum StatusViagem {
  PLANEJADA = 'planejada',
  EM_ANDAMENTO = 'em-andamento',
  CONCLUIDA = 'concluida',
  CANCELADA = 'cancelada'
}

export interface Viagem extends BaseEntity {
  usuarioId: string;
  nome: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  status: StatusViagem;
  origem: string;
  destino: string;
  distanciaTotal?: number;
  custoTotal?: number;
  numeroDias?: number;
  fotos?: string[];
  observacoes?: string;
  estatisticas?: EstatisticasViagem;
}

export interface EstatisticasViagem {
  distanciaPercorrida?: number;
  combustivelConsumido?: number;
  consumoMedio?: number;
  velocidadeMedia?: number;
  tempoTotal?: number;
  totalParadas?: number;
  custoTotalReal?: number;
}

export enum TipoParada {
  ABASTECIMENTO = 'abastecimento',
  REFEICAO = 'refeicao',
  HOSPEDAGEM = 'hospedagem',
  PONTO_INTERESSE = 'ponto-interesse',
  MANUTENCAO = 'manutencao',
  OUTROS = 'outros'
}

export interface Parada extends BaseEntity {
  diaViagemId: string;
  viagemId: string;
  tipo: TipoParada;
  nome: string;
  endereco?: string;
  coordenadas?: [number, number];
  horaChegada?: string;
  horaSaida?: string;
  duracao?: number;
  custo?: number;
  observacoes?: string;
  fotos?: string[];
  avaliacao?: number;
}

export enum CategoriaCusto {
  COMBUSTIVEL = 'combustivel',
  ALIMENTACAO = 'alimentacao',
  HOSPEDAGEM = 'hospedagem',
  PEDAGIO = 'pedagio',
  ESTACIONAMENTO = 'estacionamento',
  MANUTENCAO = 'manutencao',
  LAZER = 'lazer',
  COMPRAS = 'compras',
  OUTROS = 'outros'
}

export interface Custo extends BaseEntity {
  usuarioId: string;
  viagemId: string;
  diaViagemId?: string;
  paradaId?: string;
  categoria: CategoriaCusto;
  descricao: string;
  valor: number;
  data: string;
  hora?: string;
  local?: string;
  metodoPagamento?: string;
  observacoes?: string;
  comprovanteUrl?: string;
  tipo: 'planejado' | 'real';
  moeda?: string;
}

export interface RelatorioCustos {
  viagemId: string;
  totalPlanejado: number;
  totalReal: number;
  diferenca: number;
  percentualVariacao: number;
  resumoPorCategoria: ResumoCustos[];
  custoMedioPorDia: number;
  dataGeracao: string;
}

export interface ResumoCustos {
  categoria: CategoriaCusto;
  valorTotal: number;
  quantidade: number;
  percentual: number;
  valorMedio: number;
}

export interface DiaViagem extends BaseEntity {
  viagemId: string;
  usuarioId: string;
  numero: number;
  data: string;
  titulo?: string;
  descricao?: string;
  distanciaPercorrida?: number;
  tempoViagem?: number;
  custoTotal?: number;
  clima?: any;
  observacoes?: string;
  fotos?: string[];
}
