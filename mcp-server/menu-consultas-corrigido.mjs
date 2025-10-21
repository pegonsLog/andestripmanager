#!/usr/bin/env node

import { initializeFirebase, getFirestore } from './dist/firebase.js';
import {
  listarViagens,
  obterViagem,
  listarParadas,
  listarCustos,
  listarDiasViagem,
  buscarViagensPorStatus,
  buscarParadasPorTipo,
  buscarCustosPorCategoria
} from './dist/resources.js';
import {
  calcularRelatorioCustos,
  calcularEstatisticasViagem,
  sugerirOtimizacaoRota,
  analisarPadroesGastos
} from './dist/tools.js';

function separador(titulo) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${titulo}`);
  console.log('='.repeat(70) + '\n');
}

async function executarTodasConsultas() {
  try {
    console.log('🔥 Inicializando Firebase...');
    initializeFirebase();
    const db = getFirestore();
    console.log('✅ Firebase conectado!\n');

    // 1. LISTAR TODAS AS VIAGENS
    separador('1️⃣  TODAS AS VIAGENS DO SISTEMA');
    const todasViagens = await db.collection('viagens').get();
    console.log(`Total de viagens: ${todasViagens.size}`);
    todasViagens.docs.forEach((doc, i) => {
      const v = doc.data();
      console.log(`  ${i + 1}. ${v.nome} (${v.origem} → ${v.destino}) - Status: ${v.status}`);
    });

    // 2. LISTAR VIAGENS POR USUÁRIO
    separador('2️⃣  VIAGENS POR USUÁRIO');
    const usuarios = new Map();
    todasViagens.docs.forEach(doc => {
      const userId = doc.data().usuarioId;
      if (!usuarios.has(userId)) {
        usuarios.set(userId, []);
      }
      usuarios.get(userId).push(doc.data().nome);
    });
    
    for (const [userId, viagens] of usuarios.entries()) {
      console.log(`Usuário: ${userId.substring(0, 20)}...`);
      console.log(`  Viagens: ${viagens.length} - ${viagens.join(', ')}`);
    }

    // 3. DETALHES DE CADA VIAGEM
    separador('3️⃣  DETALHES COMPLETOS DE CADA VIAGEM');
    for (const doc of todasViagens.docs) {
      const viagem = await obterViagem(doc.id);
      console.log(`🚗 ${viagem.nome}`);
      console.log(`   ID: ${viagem.id}`);
      console.log(`   Rota: ${viagem.origem} → ${viagem.destino}`);
      console.log(`   Status: ${viagem.status}`);
      console.log(`   Distância: ${viagem.distanciaTotal || 'N/A'} km`);
      console.log(`   Custo: R$ ${viagem.custoTotal || 'N/A'}`);
      console.log('');
    }

    // 4. PARADAS DE CADA VIAGEM
    separador('4️⃣  PARADAS POR VIAGEM');
    for (const doc of todasViagens.docs) {
      const paradas = await listarParadas(doc.id);
      console.log(`${doc.data().nome}: ${paradas.length} parada(s)`);
      paradas.forEach(p => {
        console.log(`  • ${p.tipo}: ${p.nome}`);
      });
    }

    // 5. CUSTOS DE CADA VIAGEM
    separador('5️⃣  CUSTOS POR VIAGEM');
    for (const doc of todasViagens.docs) {
      const custos = await listarCustos(doc.id);
      const total = custos.reduce((sum, c) => sum + c.valor, 0);
      console.log(`${doc.data().nome}: ${custos.length} custo(s) - Total: R$ ${total.toFixed(2)}`);
      custos.forEach(c => {
        console.log(`  • ${c.categoria}: ${c.descricao} - R$ ${c.valor.toFixed(2)}`);
      });
    }

    // 6. VIAGENS POR STATUS
    separador('6️⃣  VIAGENS POR STATUS');
    const statusList = ['planejada', 'em-andamento', 'concluida', 'cancelada'];
    for (const status of statusList) {
      const viagensStatus = todasViagens.docs.filter(d => d.data().status === status);
      console.log(`${status}: ${viagensStatus.length} viagem(ns)`);
    }

    // 7. ESTATÍSTICAS DE CADA VIAGEM
    separador('7️⃣  ESTATÍSTICAS COMPLETAS');
    for (const doc of todasViagens.docs) {
      try {
        const stats = await calcularEstatisticasViagem(doc.id);
        console.log(`📊 ${stats.nomeViagem}`);
        console.log(`   Dias: ${stats.diasViagem} | Distância: ${stats.distanciaTotal} km`);
        console.log(`   Paradas: ${stats.totalParadas} | Custo: R$ ${stats.custoTotalReal.toFixed(2)}`);
        console.log(`   Média/dia: R$ ${stats.custoMedioPorDia.toFixed(2)}`);
        console.log('');
      } catch (error) {
        console.log(`⚠️  ${doc.data().nome}: ${error.message}\n`);
      }
    }

    // 8. RELATÓRIO DE CUSTOS
    separador('8️⃣  RELATÓRIO DE CUSTOS DETALHADO');
    for (const doc of todasViagens.docs) {
      try {
        const relatorio = await calcularRelatorioCustos(doc.id);
        console.log(`💰 ${doc.data().nome}`);
        console.log(`   Planejado: R$ ${relatorio.totalPlanejado.toFixed(2)}`);
        console.log(`   Real: R$ ${relatorio.totalReal.toFixed(2)}`);
        console.log(`   Diferença: R$ ${relatorio.diferenca.toFixed(2)} (${relatorio.percentualVariacao.toFixed(1)}%)`);
        
        if (relatorio.resumoPorCategoria.length > 0) {
          console.log('   Categorias:');
          relatorio.resumoPorCategoria.forEach(cat => {
            console.log(`     - ${cat.categoria}: R$ ${cat.valorTotal.toFixed(2)} (${cat.percentual.toFixed(1)}%)`);
          });
        }
        console.log('');
      } catch (error) {
        console.log(`⚠️  ${doc.data().nome}: ${error.message}\n`);
      }
    }

    // 9. ANÁLISE DE PADRÕES POR USUÁRIO
    separador('9️⃣  ANÁLISE DE PADRÕES DE GASTOS');
    for (const [userId, viagens] of usuarios.entries()) {
      try {
        const analise = await analisarPadroesGastos(userId);
        console.log(`👤 Usuário: ${userId.substring(0, 20)}...`);
        console.log(`   Viagens: ${analise.totalViagens}`);
        console.log(`   Gasto total: R$ ${analise.totalGastoGeral.toFixed(2)}`);
        console.log(`   Média/viagem: R$ ${analise.mediaGastoPorViagem.toFixed(2)}`);
        console.log('');
      } catch (error) {
        console.log(`⚠️  Erro: ${error.message}\n`);
      }
    }

    // 10. OTIMIZAÇÃO DE ROTAS (CORRIGIDO)
    separador('🔟 SUGESTÕES DE OTIMIZAÇÃO DE ROTA');
    for (const doc of todasViagens.docs) {
      try {
        const otimizacao = await sugerirOtimizacaoRota(doc.id);
        console.log(`🗺️  ${doc.data().nome}`);
        
        // Verificar se as propriedades existem antes de acessar
        if (otimizacao.totalParadas !== undefined) {
          console.log(`   Paradas: ${otimizacao.totalParadas} (${otimizacao.paradasComCoordenadas || 0} com coordenadas)`);
        }
        
        if (otimizacao.sugestoes && Array.isArray(otimizacao.sugestoes)) {
          console.log('   Sugestões:');
          otimizacao.sugestoes.forEach(s => {
            console.log(`     • ${s}`);
          });
        } else if (otimizacao.mensagem) {
          console.log(`   ${otimizacao.mensagem}`);
        }
        console.log('');
      } catch (error) {
        console.log(`⚠️  ${doc.data().nome}: ${error.message}\n`);
      }
    }

    // 11. RANKING DE VIAGENS
    separador('1️⃣1️⃣  RANKING DE VIAGENS');
    
    console.log('🏆 Por Distância:');
    const viagensOrdenadas = [...todasViagens.docs]
      .map(d => ({ nome: d.data().nome, distancia: d.data().distanciaTotal || 0 }))
      .sort((a, b) => b.distancia - a.distancia);
    viagensOrdenadas.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.nome}: ${v.distancia} km`);
    });

    console.log('\n💰 Por Custo:');
    const viagensPorCusto = [...todasViagens.docs]
      .map(d => ({ nome: d.data().nome, custo: d.data().custoTotal || 0 }))
      .sort((a, b) => b.custo - a.custo);
    viagensPorCusto.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.nome}: R$ ${v.custo}`);
    });

    // 12. TOTAIS GERAIS
    separador('1️⃣2️⃣  TOTAIS GERAIS DO SISTEMA');
    
    let totalParadas = 0;
    let totalCustos = 0;
    let valorTotalCustos = 0;
    
    for (const doc of todasViagens.docs) {
      const paradas = await listarParadas(doc.id);
      const custos = await listarCustos(doc.id);
      totalParadas += paradas.length;
      totalCustos += custos.length;
      valorTotalCustos += custos.reduce((sum, c) => sum + c.valor, 0);
    }
    
    console.log(`📊 Estatísticas Globais:`);
    console.log(`   Total de viagens: ${todasViagens.size}`);
    console.log(`   Total de usuários: ${usuarios.size}`);
    console.log(`   Total de paradas: ${totalParadas}`);
    console.log(`   Total de custos registrados: ${totalCustos}`);
    console.log(`   Valor total de custos: R$ ${valorTotalCustos.toFixed(2)}`);
    console.log(`   Média de paradas/viagem: ${(totalParadas / todasViagens.size).toFixed(1)}`);
    console.log(`   Média de custos/viagem: R$ ${(valorTotalCustos / todasViagens.size).toFixed(2)}`);

    separador('✅ TODAS AS CONSULTAS CONCLUÍDAS COM SUCESSO');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error(error.stack);
  }
}

executarTodasConsultas();
