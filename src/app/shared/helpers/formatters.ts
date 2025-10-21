/**
 * Funções auxiliares para formatação de dados
 * Utilizadas na geração de álbuns de viagem e relatórios
 */

/**
 * Formata uma data no formato ISO para o padrão brasileiro
 * @param dataISO Data no formato ISO (YYYY-MM-DD)
 * @returns Data formatada (DD/MM/YYYY)
 */
export function formatarData(dataISO: string): string {
    if (!dataISO) return '-';
    
    try {
        const data = new Date(dataISO);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        
        return `${dia}/${mes}/${ano}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataISO;
    }
}

/**
 * Formata uma data completa com hora
 * @param dataISO Data no formato ISO
 * @param hora Hora no formato HH:mm
 * @returns Data e hora formatadas
 */
export function formatarDataHora(dataISO: string, hora?: string): string {
    const dataFormatada = formatarData(dataISO);
    
    if (hora) {
        return `${dataFormatada} às ${hora}`;
    }
    
    return dataFormatada;
}

/**
 * Formata um valor monetário para o padrão brasileiro
 * @param valor Valor numérico
 * @param moeda Código da moeda (padrão: BRL)
 * @returns Valor formatado (R$ 1.234,56)
 */
export function formatarMoeda(valor: number, moeda: string = 'BRL'): string {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: moeda
        }).format(valor);
    } catch (error) {
        console.error('Erro ao formatar moeda:', error);
        return `R$ ${valor.toFixed(2)}`;
    }
}

/**
 * Formata distância em quilômetros
 * @param distancia Distância em km
 * @returns Distância formatada (123,45 km)
 */
export function formatarDistancia(distancia: number): string {
    if (distancia === null || distancia === undefined) return '-';
    
    return `${distancia.toFixed(2)} km`;
}

/**
 * Formata tempo em minutos para horas e minutos
 * @param minutos Tempo em minutos
 * @returns Tempo formatado (2h 30min)
 */
export function formatarTempo(minutos: number): string {
    if (minutos === null || minutos === undefined) return '-';
    
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas === 0) {
        return `${mins}min`;
    }
    
    if (mins === 0) {
        return `${horas}h`;
    }
    
    return `${horas}h ${mins}min`;
}

/**
 * Formata temperatura em graus Celsius
 * @param temperatura Temperatura em °C
 * @returns Temperatura formatada (25°C)
 */
export function formatarTemperatura(temperatura: number): string {
    if (temperatura === null || temperatura === undefined) return '-';
    
    return `${temperatura.toFixed(1)}°C`;
}

/**
 * Formata consumo de combustível
 * @param consumo Consumo em km/l
 * @returns Consumo formatado (12,5 km/l)
 */
export function formatarConsumo(consumo: number): string {
    if (consumo === null || consumo === undefined) return '-';
    
    return `${consumo.toFixed(2)} km/l`;
}

/**
 * Formata velocidade média
 * @param velocidade Velocidade em km/h
 * @returns Velocidade formatada (80 km/h)
 */
export function formatarVelocidade(velocidade: number): string {
    if (velocidade === null || velocidade === undefined) return '-';
    
    return `${velocidade.toFixed(0)} km/h`;
}

/**
 * Capitaliza a primeira letra de cada palavra
 * @param texto Texto a ser capitalizado
 * @returns Texto capitalizado
 */
export function capitalizarTexto(texto: string): string {
    if (!texto) return '';
    
    return texto
        .toLowerCase()
        .split(' ')
        .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
}

/**
 * Trunca texto com reticências
 * @param texto Texto a ser truncado
 * @param maxLength Tamanho máximo
 * @returns Texto truncado
 */
export function truncarTexto(texto: string, maxLength: number): string {
    if (!texto || texto.length <= maxLength) return texto;
    
    return texto.substring(0, maxLength - 3) + '...';
}

/**
 * Formata número de dias
 * @param dias Número de dias
 * @returns Texto formatado (1 dia, 5 dias)
 */
export function formatarDias(dias: number): string {
    if (dias === null || dias === undefined) return '-';
    
    return dias === 1 ? '1 dia' : `${dias} dias`;
}

/**
 * Formata período de viagem
 * @param dataInicio Data de início
 * @param dataFim Data de fim
 * @returns Período formatado
 */
export function formatarPeriodo(dataInicio: string, dataFim: string): string {
    const inicio = formatarData(dataInicio);
    const fim = formatarData(dataFim);
    
    return `${inicio} a ${fim}`;
}

/**
 * Formata categoria de custo para exibição
 * @param categoria Categoria do custo
 * @returns Categoria formatada
 */
export function formatarCategoriaCusto(categoria: string): string {
    const categorias: { [key: string]: string } = {
        'combustivel': 'Combustível',
        'alimentacao': 'Alimentação',
        'hospedagem': 'Hospedagem',
        'manutencao': 'Manutenção',
        'pedagio': 'Pedágio',
        'estacionamento': 'Estacionamento',
        'lazer': 'Lazer',
        'outros': 'Outros'
    };
    
    return categorias[categoria] || capitalizarTexto(categoria);
}

/**
 * Formata tipo de manutenção para exibição
 * @param tipo Tipo de manutenção
 * @returns Tipo formatado
 */
export function formatarTipoManutencao(tipo: string): string {
    const tipos: { [key: string]: string } = {
        'preventiva': 'Preventiva',
        'corretiva': 'Corretiva',
        'emergencial': 'Emergencial',
        'revisao': 'Revisão'
    };
    
    return tipos[tipo] || capitalizarTexto(tipo);
}

/**
 * Formata condição climática para exibição
 * @param condicao Condição climática
 * @returns Condição formatada
 */
export function formatarCondicaoClimatica(condicao: string): string {
    const condicoes: { [key: string]: string } = {
        'ensolarado': '☀️ Ensolarado',
        'parcialmente-nublado': '⛅ Parcialmente Nublado',
        'nublado': '☁️ Nublado',
        'chuvoso': '🌧️ Chuvoso',
        'tempestade': '⛈️ Tempestade',
        'nevoa': '🌫️ Névoa'
    };
    
    return condicoes[condicao] || capitalizarTexto(condicao);
}

/**
 * Formata status da viagem para exibição
 * @param status Status da viagem
 * @returns Status formatado
 */
export function formatarStatusViagem(status: string): string {
    const statusMap: { [key: string]: string } = {
        'planejada': 'Planejada',
        'em-andamento': 'Em Andamento',
        'concluida': 'Concluída',
        'cancelada': 'Cancelada'
    };
    
    return statusMap[status] || capitalizarTexto(status);
}

/**
 * Calcula percentual
 * @param valor Valor atual
 * @param total Valor total
 * @returns Percentual formatado (25,5%)
 */
export function calcularPercentual(valor: number, total: number): string {
    if (total === 0) return '0%';
    
    const percentual = (valor / total) * 100;
    return `${percentual.toFixed(1)}%`;
}
