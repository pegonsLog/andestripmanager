#!/usr/bin/env node

/**
 * Script completo de teste para todas as funcionalidades do servidor MCP
 */

import { initializeFirebase } from './dist/firebase.js';
import {
  listarViagens,
  obterViagem,
  listarParadas,
  listarCustos,
  listarDiasViagem,
  buscarViagensPorStatus,
  buscarParadasPorTipo
} from './dist/resources.js';
import {
  calcularRelatorioCustos,
  calcularEstatisticasViagem,
  sugerirOtimizacaoRota,
  analisarPadroesGastos
} from './dist/tools.js';

// IDs das suas viagens
const VIAGEM_TESTE_ID = 'RTAFGrbxjc2l3dajgguN';
const VIAGEM_ATACAMA_ID = '8uV0IrqGt6bPXkL99lrz';
const USUARIO1_ID = 'hBkb4hW3Q7Pf2Z3OX6gF34TE8dr1';
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

    // 1. LISTAR VIAGENS
    separador('1️⃣  LISTAR VIAGENS DO USUÁRIO 1');
    const viagens1 = await listarViagens(USUARIO1_ID);
    console.log(`Encontradas ${viagens1.length} viagem(ns):`);
    viagens1.forEach(v => {
      console.log(`  🚗 ${v.nome} (${v.origem} → ${v.destino})`);
    });

    separador('2️⃣  LISTAR VIAGENS DO USUÁRIO 2');
    const viagens2 = await listarViagens(USUARIO2_ID);
    console.log(`Encontradas ${viagens2.length} viagem(ns):`);
    viagens2.forEach(v => {
      console.log(`  🚗 ${v.nome} (${v.origem} → ${v.destino})`);
    });

    // 2. OBTER VIAGEM ESPECÍFICA
    separador('3️⃣  DETALHES DA VIAGEM ATACAMA');
    const viagemAtacama = await obterViagem(VIAGEM_ATACAMA_ID);
    if (viagemAtacama) {
      console.log(`Nome: ${viagemAtacama.nome}`);
      console.log(`Origem: ${viagemAtacama.origem}`);
      console.log(`Destino: ${viagemAtacama.destino}`);
      console.log(`Status: ${viagemAtacama.status}`);
      console.log(`Período: ${viagemAtacama.dataInicio} até ${viagemAtacama.dataFim}`);
      console.log(`Distância: ${viagemAtacama.distanciaTotal || 'N/A'} km`);
      console.log(`Custo total: R$ ${viagemAtacama.custoTotal || 'N/A'}`);
    }

    // 3. LISTAR PARADAS
    separador('4️⃣  PARADAS DA VIAGEM ATACAMA');
    const paradas = await listarParadas(VIAGEM_ATACAMA_ID);
    if (paradas.length > 0) {
      console.log(`Encontradas ${paradas.length} parada(s):`);
      paradas.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.tipo}: ${p.nome}`);
        console.log(`     Endereço: ${p.endereco || 'N/A'}`);
        console.log(`     Chegada: ${p.horaChegada || 'N/A'}`);
      });
    } else {
      console.log('❌ Nenhuma parada cadastrada');
    }

    // 4. LISTAR CUSTOS
    separador('5️⃣  CUSTOS DA VIAGEM ATACAMA');
    const custos = await listarCustos(VIAGEM_ATACAMA_ID);
    if (custos.length > 0) {
      console.log(`Encontrados ${custos.length} custo(s):`);
      custos.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.categoria}: ${c.descricao}`);
        console.log(`     Valor: R$ ${c.valor.toFixed(2)}`);
        console.log(`     Tipo: ${c.tipo}`);
        console.log(`     Data: ${c.data}`);
      });
    } else {
      console.log('❌ Nenhum custo cadastrado');
    }

    // 5. LISTAR DIAS DA VIAGEM
    separador('6️⃣  DIAS DA VIAGEM ATACAMA');
    const dias = await listarDiasViagem(VIAGEM_ATACAMA_ID);
    if (dias.length > 0) {
      console.log(`Encontrados ${dias.length} dia(s):`);
      dias.forEach((d, i) => {
        console.log(`  Dia ${d.numero}: ${d.data}`);
        console.log(`     Título: ${d.titulo || 'N/A'}`);
        console.log(`     Distância: ${d.distanciaPercorrida || 0} km`);
      });
    } else {
      console.log('❌ Nenhum dia cadastrado');
    }

    // 6. BUSCAR VIAGENS POR STATUS
    separador('7️⃣  VIAGENS PLANEJADAS DO USUÁRIO 2');
    const viagensPlanejadas = await buscarViagensPorStatus(USUARIO2_ID, 'planejada');
    console.log(`Encontradas ${viagensPlanejadas.length} viagem(ns) planejada(s):`);
    viagensPlanejadas.forEach(v => {
      console.log(`  🚗 ${v.nome}`);
    });

    // 7. CALCULAR ESTATÍSTICAS
    separador('8️⃣  ESTATÍSTICAS DA VIAGEM ATACAMA');
    try {
      const stats = await calcularEstatisticasViagem(VIAGEM_ATACAMA_ID);
      console.log(`Nome: ${stats.nomeViagem}`);
      console.log(`Status: ${stats.status}`);
      console.log(`Dias de viagem: ${stats.diasViagem}`);
      console.log(`Distância total: ${stats.distanciaTotal} km`);
      console.log(`Total de paradas: ${stats.totalParadas}`);
      console.log(`Custo total real: R$ ${stats.custoTotalReal.toFixed(2)}`);
      console.log(`Custo médio por dia: R$ ${stats.custoMedioPorDia.toFixed(2)}`);
    } catch (error) {
      console.log(`⚠️  ${error.message}`);
    }

    // 8. RELATÓRIO DE CUSTOS
    separador('9️⃣  RELATÓRIO DE CUSTOS DA VIAGEM ATACAMA');
    try {
      const relatorio = await calcularRelatorioCustos(VIAGEM_ATACAMA_ID);
      console.log(`Total planejado: R$ ${relatorio.totalPlanejado.toFixed(2)}`);
      console.log(`Total real: R$ ${relatorio.totalReal.toFixed(2)}`);
      console.log(`Diferença: R$ ${relatorio.diferenca.toFixed(2)}`);
      console.log(`Variação: ${relatorio.percentualVariacao.toFixed(2)}%`);
      console.log(`Custo médio por dia: R$ ${relatorio.custoMedioPorDia.toFixed(2)}`);
      
      if (relatorio.resumoPorCategoria.length > 0) {
        console.log('\nResumo por categoria:');
        relatorio.resumoPorCategoria.forEach(cat => {
          console.log(`  ${cat.categoria}: R$ ${cat.valorTotal.toFixed(2)} (${cat.percentual.toFixed(1)}%)`);
        });
      }
    } catch (error) {
      console.log(`⚠️  ${error.message}`);
    }

    // 9. SUGERIR OTIMIZAÇÃO DE ROTA
    separador('🔟 OTIMIZAÇÃO DE ROTA DA VIAGEM ATACAMA');
    try {
      const otimizacao = await sugerirOtimizacaoRota(VIAGEM_ATACAMA_ID);
      console.log(`Total de paradas: ${otimizacao.totalParadas}`);
      console.log(`Paradas com coordenadas: ${otimizacao.paradasComCoordenadas}`);
      console.log('\nSugestões:');
      otimizacao.sugestoes.forEach(s => {
        console.log(`  • ${s}`);
      });
    } catch (error) {
      console.log(`⚠️  ${error.message}`);
    }

    // 10. ANALISAR PADRÕES DE GASTOS
    separador('1️⃣1️⃣  ANÁLISE DE PADRÕES DE GASTOS - USUÁRIO 2');
    try {
      const analise = await analisarPadroesGastos(USUARIO2_ID);
      console.log(`Total de viagens: ${analise.totalViagens}`);
      console.log(`Gasto total geral: R$ ${analise.totalGastoGeral.toFixed(2)}`);
      console.log(`Média de gasto por viagem: R$ ${analise.mediaGastoPorViagem.toFixed(2)}`);
      
      console.log('\nDetalhes por viagem:');
      analise.viagens.forEach(v => {
        console.log(`  🚗 ${v.nomeViagem}`);
        console.log(`     Total gasto: R$ ${v.totalGasto.toFixed(2)}`);
        console.log(`     Gasto por dia: R$ ${v.gastoPorDia.toFixed(2)}`);
      });
    } catch (error) {
      console.log(`⚠️  ${error.message}`);
    }

    separador('✅ TESTES CONCLUÍDOS');
    console.log('Todos os testes foram executados com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executa todos os testes
testarTudo();
