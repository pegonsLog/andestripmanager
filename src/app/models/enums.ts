/**
 * Status possíveis de uma viagem
 */
export enum StatusViagem {
    PLANEJADA = 'planejada',
    EM_ANDAMENTO = 'em-andamento',
    FINALIZADA = 'finalizada',
    CANCELADA = 'cancelada'
}

/**
 * Tipos de parada durante a viagem
 */
export enum TipoParada {
    ABASTECIMENTO = 'abastecimento',
    REFEICAO = 'refeicao',
    PONTO_INTERESSE = 'ponto-interesse',
    DESCANSO = 'descanso',
    MANUTENCAO = 'manutencao',
    HOSPEDAGEM = 'hospedagem'
}

/**
 * Categorias de custos da viagem
 */
export enum CategoriaCusto {
    COMBUSTIVEL = 'combustivel',
    HOSPEDAGEM = 'hospedagem',
    ALIMENTACAO = 'alimentacao',
    MANUTENCAO = 'manutencao',
    PEDAGIO = 'pedagio',
    SEGURO = 'seguro',
    OUTROS = 'outros'
}

/**
 * Tipos de manutenção
 */
export enum TipoManutencao {
    PREVENTIVA = 'preventiva',
    CORRETIVA = 'corretiva',
    EMERGENCIAL = 'emergencial'
}

/**
 * Condições climáticas
 */
export enum CondicaoClimatica {
    ENSOLARADO = 'ensolarado',
    NUBLADO = 'nublado',
    CHUVOSO = 'chuvoso',
    TEMPESTADE = 'tempestade',
    NEBLINA = 'neblina',
    VENTO_FORTE = 'vento-forte'
}

/**
 * Tipos de combustível
 */
export enum TipoCombustivel {
    GASOLINA_COMUM = 'gasolina-comum',
    GASOLINA_ADITIVADA = 'gasolina-aditivada',
    ETANOL = 'etanol',
    DIESEL = 'diesel'
}