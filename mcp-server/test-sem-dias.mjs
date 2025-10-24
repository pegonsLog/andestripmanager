#!/usr/bin/env node

import { initializeFirebase } from './dist/firebase.js';
import {
  listarViagens,
  obterViagem,
  listarParadas,
  listarCustos,
  buscarViagensPorStatus
} from './dist/resources.js';
import {
  calcularRelatorioCustos,
  calcularEstatisticasViagem,
  sugerirOtimizacaoRota,
  analisarPadroesGastos
} from './dist/tools.js';

const VIAGEM_ATACAMA_ID = '8uV0IrqGt6bPXkL99lrz';
const USUARIO2_ID = 'fJbA4p1dOSZUHT3fbN4WJBHOusr2';

function separador(titulo) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${titulo}`);
  console.log('='.repeat(60) + '\n');
}

async function testarTudo() {
  try {
    console.log('🔥 Inicializando Firebase...');
    initializeFirebase();
    console.log('✅ Firebase conectado!\n');

    // ESTATÍSTICAS
    separador('📊 ESTATÍSTICAS DA VIAGEM ATACAMA');
    const stats = await calcularEstatisticasViagem(VIAGEM_ATACAMA_ID);
    console.log(`Nome: ${stats.nomeViagem}`);
    console.log(`Status: ${stats.status}`);
    console.log(`Dias de viagem: ${stats.diasViagem}`);
    console.log(`Distância total: ${stats.distanciaTotal} km`);
    console.log(`Total de paradas: ${stats.totalParadas}`);
    console.log(`Custo total real: R$ ${stats.custoTotalReal.toFixed(2)}`);
    console.log(`Custo médio por dia: R$ ${stats.custoMedioPorDia.toFixed(2)}`);

    // RELATÓRIO DE CUSTOS
    separador('💰 RELATÓRIO DE CUSTOS');
    const relatorio = await calcularRelatorioCustos(VIAGEM_ATACAMA_ID);
    console.log(`Total planejado: R$ ${relatorio.totalPlanejado.toFixed(2)}`);
    console.log(`Total real: R$ ${relatorio.totalReal.toFixed(2)}`);
    console.log(`Diferença: R$ ${relatorio.diferenca.toFixed(2)}`);
    console.log(`Variação: ${relatorio.percentualVariacao.toFixed(2)}%`);
    console.log(`Custo médio por dia: R$ ${relatorio.custoMedioPorDia.toFixed(2)}`);
    
    if (relatorio.resumoPorCategoria.length > 0) {
      console.log('\n📋 Resumo por categoria:');
      relatorio.resumoPorCategoria.forEach(cat => {
        console.log(`  ${cat.categoria}: R$ ${cat.valorTotal.toFixed(2)} (${cat.percentual.toFixed(1)}%)`);
      });
    }

    // OTIMIZAÇÃO DE ROTA
    separador('🗺️  OTIMIZAÇÃO DE ROTA');
    const otimizacao = await sugerirOtimizacaoRota(VIAGEM_ATACAMA_ID);
    console.log(`Total de paradas: ${otimizacao.totalParadas}`);
    console.log(`Paradas com coordenadas: ${otimizacao.paradasComCoordenadas}`);
    console.log('\n💡 Sugestões:');
    otimizacao.sugestoes.forEach(s => {
      console.log(`  • ${s}`);
    });

    // ANÁLISE DE PADRÕES
    separador('📈 ANÁLISE DE PADRÕES DE GASTOS');
    const analise = await analisarPadroesGastos(USUARIO2_ID);
    console.log(`Total de viagens: ${analise.totalViagens}`);
    console.log(`Gasto total geral: R$ ${analise.totalGastoGeral.toFixed(2)}`);
    console.log(`Média de gasto por viagem: R$ ${analise.mediaGastoPorViagem.toFixed(2)}`);
    
    console.log('\n🚗 Detalhes por viagem:');
    analise.viagens.forEach(v => {
      console.log(`  ${v.nomeViagem}`);
      console.log(`     Total: R$ ${v.totalGasto.toFixed(2)} | Por dia: R$ ${v.gastoPorDia.toFixed(2)}`);
    });

    separador('✅ TESTES CONCLUÍDOS COM SUCESSO');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testarTudo();
