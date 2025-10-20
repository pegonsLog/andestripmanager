/**
 * Implementação das ferramentas MCP para análise e manipulação de dados
 */
import { getFirestore } from './firebase.js';
import { 
  listarViagens, 
  listarParadas, 
  listarCustos,
  obterViagem 
} from './resources.js';
import { 
  Viagem, 
  Parada, 
  Custo, 
  RelatorioCustos, 
  ResumoCustos,
  CategoriaCusto 
} from './types.js';

/**
 * Calcula o relatório de custos de uma viagem
 */
export async function calcularRelatorioCustos(viagemId: string): Promise<RelatorioCustos> {
  const custos = await listarCustos(viagemId);
  const viagem = await obterViagem(viagemId);
  
  if (!viagem) {
    throw new Error(`Viagem ${viagemId} não encontrada`);
  }

  const custosReais = custos.filter(c => c.tipo === 'real');
  const custosPlanejados = custos.filter(c => c.tipo === 'planejado');

  const totalReal = custosReais.reduce((sum, c) => sum + c.valor, 0);
  const totalPlanejado = custosPlanejados.reduce((sum, c) => sum + c.valor, 0);
  const diferenca = totalReal - totalPlanejado;
  const percentualVariacao = totalPlanejado > 0 
    ? ((diferenca / totalPlanejado) * 100) 
    : 0;

  // Agrupa custos por categoria
  const custosPorCategoria = new Map<CategoriaCusto, Custo[]>();
  custosReais.forEach(custo => {
    const lista = custosPorCategoria.get(custo.categoria) || [];
    lista.push(custo);
    custosPorCategoria.set(custo.categoria, lista);
  });

  const resumoPorCategoria: ResumoCustos[] = Array.from(custosPorCategoria.entries()).map(
    ([categoria, custos]) => {
      const valorTotal = custos.reduce((sum, c) => sum + c.valor, 0);
      return {
        categoria,
        valorTotal,
        quantidade: custos.length,
        percentual: totalReal > 0 ? (valorTotal / totalReal) * 100 : 0,
        valorMedio: custos.length > 0 ? valorTotal / custos.length : 0
      };
    }
  );

  // Calcula custo médio por dia
  const numeroDias = viagem.numeroDias || 1;
  const custoMedioPorDia = totalReal / numeroDias;

  return {
    viagemId,
    totalPlanejado,
    totalReal,
    diferenca,
    percentualVariacao,
    resumoPorCategoria,
    custoMedioPorDia,
    dataGeracao: new Date().toISOString()
  };
}

/**
 * Calcula estatísticas de uma viagem
 */
export async function calcularEstatisticasViagem(viagemId: string): Promise<any> {
  const viagem = await obterViagem(viagemId);
  const paradas = await listarParadas(viagemId);
  const custos = await listarCustos(viagemId);

  if (!viagem) {
    throw new Error(`Viagem ${viagemId} não encontrada`);
  }

  const paradasAbastecimento = paradas.filter(p => p.tipo === 'abastecimento');
  const totalParadas = paradas.length;
  const custosReais = custos.filter(c => c.tipo === 'real');
  const custoTotalReal = custosReais.reduce((sum, c) => sum + c.valor, 0);

  // Calcula distância total (se disponível nas paradas)
  let distanciaTotal = viagem.distanciaTotal || 0;

  // Calcula tempo total de viagem
  const dataInicio = new Date(viagem.dataInicio);
  const dataFim = new Date(viagem.dataFim);
  const diasViagem = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

  return {
    viagemId,
    nomeViagem: viagem.nome,
    status: viagem.status,
    origem: viagem.origem,
    destino: viagem.destino,
    dataInicio: viagem.dataInicio,
    dataFim: viagem.dataFim,
    diasViagem,
    distanciaTotal,
    totalParadas,
    paradasAbastecimento: paradasAbastecimento.length,
    custoTotalReal,
    custoMedioPorDia: diasViagem > 0 ? custoTotalReal / diasViagem : 0,
    mediaGastoPorParada: totalParadas > 0 ? custoTotalReal / totalParadas : 0
  };
}

/**
 * Sugere otimização de rota baseado nas paradas
 */
export async function sugerirOtimizacaoRota(viagemId: string): Promise<any> {
  const paradas = await listarParadas(viagemId);
  
  if (paradas.length < 2) {
    return {
      mensagem: 'Número insuficiente de paradas para otimização',
      paradasAtuais: paradas.length
    };
  }

  // Filtra paradas com coordenadas
  const paradasComCoordenadas = paradas.filter(p => p.coordenadas && p.coordenadas.length === 2);

  if (paradasComCoordenadas.length < 2) {
    return {
      mensagem: 'Paradas sem coordenadas suficientes para otimização',
      paradasComCoordenadas: paradasComCoordenadas.length,
      totalParadas: paradas.length
    };
  }

  // Análise simples: identifica paradas fora de ordem geográfica
  const sugestoes: string[] = [];
  
  for (let i = 0; i < paradasComCoordenadas.length - 1; i++) {
    const atual = paradasComCoordenadas[i];
    const proxima = paradasComCoordenadas[i + 1];
    
    if (atual.coordenadas && proxima.coordenadas) {
      const distancia = calcularDistancia(
        atual.coordenadas[0], atual.coordenadas[1],
        proxima.coordenadas[0], proxima.coordenadas[1]
      );
      
      if (distancia > 500) { // Mais de 500km entre paradas
        sugestoes.push(
          `Grande distância (${distancia.toFixed(0)}km) entre "${atual.nome}" e "${proxima.nome}". ` +
          `Considere adicionar uma parada intermediária.`
        );
      }
    }
  }

  return {
    viagemId,
    totalParadas: paradas.length,
    paradasComCoordenadas: paradasComCoordenadas.length,
    sugestoes: sugestoes.length > 0 ? sugestoes : ['Rota parece otimizada'],
    paradas: paradasComCoordenadas.map(p => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      coordenadas: p.coordenadas
    }))
  };
}

/**
 * Analisa padrões de gastos
 */
export async function analisarPadroesGastos(usuarioId: string): Promise<any> {
  const viagens = await listarViagens(usuarioId);
  
  if (viagens.length === 0) {
    return {
      mensagem: 'Nenhuma viagem encontrada para análise',
      totalViagens: 0
    };
  }

  const analises = await Promise.all(
    viagens.map(async (viagem) => {
      const custos = await listarCustos(viagem.id!);
      const custosReais = custos.filter(c => c.tipo === 'real');
      const totalGasto = custosReais.reduce((sum, c) => sum + c.valor, 0);
      
      // Agrupa por categoria
      const gastosPorCategoria = new Map<string, number>();
      custosReais.forEach(custo => {
        const atual = gastosPorCategoria.get(custo.categoria) || 0;
        gastosPorCategoria.set(custo.categoria, atual + custo.valor);
      });

      return {
        viagemId: viagem.id,
        nomeViagem: viagem.nome,
        totalGasto,
        numeroDias: viagem.numeroDias || 1,
        gastoPorDia: totalGasto / (viagem.numeroDias || 1),
        gastosPorCategoria: Object.fromEntries(gastosPorCategoria)
      };
    })
  );

  const totalGastoGeral = analises.reduce((sum, a) => sum + a.totalGasto, 0);
  const mediaGastoPorViagem = totalGastoGeral / viagens.length;

  return {
    usuarioId,
    totalViagens: viagens.length,
    totalGastoGeral,
    mediaGastoPorViagem,
    viagens: analises
  };
}

/**
 * Calcula distância entre dois pontos (fórmula de Haversine)
 */
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
