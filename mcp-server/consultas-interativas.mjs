#!/usr/bin/env node

import { initializeFirebase, getFirestore } from './dist/firebase.js';
import {
  listarViagens,
  obterViagem,
  listarParadas,
  listarCustos
} from './dist/resources.js';
import {
  calcularRelatorioCustos,
  calcularEstatisticasViagem,
  analisarPadroesGastos
} from './dist/tools.js';
import * as readline from 'readline';

let db;

function separador(titulo) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${titulo}`);
  console.log('='.repeat(70) + '\n');
}

async function listarTodasViagens() {
  const snapshot = await db.collection('viagens').get();
  console.log(`\n📊 Total de viagens: ${snapshot.size}\n`);
  
  snapshot.docs.forEach((doc, i) => {
    const v = doc.data();
    console.log(`${i + 1}. 🚗 ${v.nome}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Rota: ${v.origem} → ${v.destino}`);
    console.log(`   Status: ${v.status}`);
    console.log(`   Usuário: ${v.usuarioId.substring(0, 20)}...`);
    console.log('');
  });
}

async function consultarDiario() {
  const diasSnapshot = await db.collection('diasViagem').get();
  
  if (diasSnapshot.empty) {
    console.log('\n❌ Nenhum registro de diário encontrado.\n');
    return;
  }
  
  console.log(`\n✅ Encontrados ${diasSnapshot.size} registro(s) de diário:\n`);
  
  const diasPorViagem = new Map();
  diasSnapshot.docs.forEach(doc => {
    const dia = doc.data();
    if (!diasPorViagem.has(dia.viagemId)) {
      diasPorViagem.set(dia.viagemId, []);
    }
    diasPorViagem.get(dia.viagemId).push({ id: doc.id, ...dia });
  });
  
  for (const [viagemId, dias] of diasPorViagem.entries()) {
    const viagemDoc = await db.collection('viagens').doc(viagemId).get();
    const viagemNome = viagemDoc.exists ? viagemDoc.data().nome : 'Desconhecida';
    
    console.log(`🚗 ${viagemNome}`);
    console.log(`   Dias registrados: ${dias.length}\n`);
  }
}

async function listarParadasTodas() {
  const viagens = await db.collection('viagens').get();
  let totalParadas = 0;
  
  console.log('\n📍 Paradas por viagem:\n');
  
  for (const doc of viagens.docs) {
    const paradas = await listarParadas(doc.id);
    totalParadas += paradas.length;
    
    console.log(`🚗 ${doc.data().nome}: ${paradas.length} parada(s)`);
    paradas.forEach(p => {
      console.log(`   • ${p.tipo}: ${p.nome}`);
    });
    console.log('');
  }
  
  console.log(`Total geral: ${totalParadas} paradas\n`);
}

async function listarCustosTodos() {
  const viagens = await db.collection('viagens').get();
  let totalCustos = 0;
  let valorTotal = 0;
  
  console.log('\n💰 Custos por viagem:\n');
  
  for (const doc of viagens.docs) {
    const custos = await listarCustos(doc.id);
    const soma = custos.reduce((sum, c) => sum + c.valor, 0);
    totalCustos += custos.length;
    valorTotal += soma;
    
    console.log(`🚗 ${doc.data().nome}: ${custos.length} custo(s) - R$ ${soma.toFixed(2)}`);
    custos.forEach(c => {
      console.log(`   • ${c.categoria}: ${c.descricao} - R$ ${c.valor.toFixed(2)}`);
    });
    console.log('');
  }
  
  console.log(`Total geral: ${totalCustos} custos - R$ ${valorTotal.toFixed(2)}\n`);
}

async function estatisticasGerais() {
  const viagens = await db.collection('viagens').get();
  const usuarios = new Set();
  let totalParadas = 0;
  let totalCustos = 0;
  let valorTotal = 0;
  
  for (const doc of viagens.docs) {
    usuarios.add(doc.data().usuarioId);
    const paradas = await listarParadas(doc.id);
    const custos = await listarCustos(doc.id);
    totalParadas += paradas.length;
    totalCustos += custos.length;
    valorTotal += custos.reduce((sum, c) => sum + c.valor, 0);
  }
  
  console.log('\n📊 ESTATÍSTICAS GERAIS DO SISTEMA\n');
  console.log(`Total de viagens: ${viagens.size}`);
  console.log(`Total de usuários: ${usuarios.size}`);
  console.log(`Total de paradas: ${totalParadas}`);
  console.log(`Total de custos: ${totalCustos}`);
  console.log(`Valor total: R$ ${valorTotal.toFixed(2)}`);
  console.log(`Média de paradas/viagem: ${(totalParadas / viagens.size).toFixed(1)}`);
  console.log(`Média de custos/viagem: R$ ${(valorTotal / viagens.size).toFixed(2)}\n`);
}

async function detalhesViagem() {
  const viagens = await db.collection('viagens').get();
  
  console.log('\n🚗 Escolha uma viagem:\n');
  viagens.docs.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.data().nome}`);
  });
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\nNúmero da viagem (ou Enter para voltar): ', async (answer) => {
    if (!answer) {
      rl.close();
      mostrarMenu();
      return;
    }
    
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < viagens.docs.length) {
      const viagemId = viagens.docs[index].id;
      
      console.log('\n📊 Carregando detalhes...\n');
      
      const viagem = await obterViagem(viagemId);
      const paradas = await listarParadas(viagemId);
      const custos = await listarCustos(viagemId);
      const stats = await calcularEstatisticasViagem(viagemId);
      
      console.log(`�� ${viagem.nome}`);
      console.log(`   Rota: ${viagem.origem} → ${viagem.destino}`);
      console.log(`   Status: ${viagem.status}`);
      console.log(`   Distância: ${viagem.distanciaTotal || 'N/A'} km`);
      console.log(`   Dias: ${stats.diasViagem}`);
      console.log(`   Paradas: ${paradas.length}`);
      console.log(`   Custos: ${custos.length} (R$ ${stats.custoTotalReal.toFixed(2)})`);
      console.log(`   Média/dia: R$ ${stats.custoMedioPorDia.toFixed(2)}\n`);
    }
    
    rl.close();
    mostrarMenu();
  });
}

function mostrarMenu() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔥 CONSULTAS MCP FIREBASE - ANDESTRIPMANAGER');
  console.log('='.repeat(70));
  console.log('\n1.  📋 Listar todas as viagens');
  console.log('2.  📖 Consultar diário (dias de viagem)');
  console.log('3.  📍 Listar todas as paradas');
  console.log('4.  💰 Listar todos os custos');
  console.log('5.  📊 Estatísticas gerais do sistema');
  console.log('6.  🔍 Detalhes de uma viagem específica');
  console.log('0.  ❌ Sair\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Escolha uma opção: ', async (opcao) => {
    rl.close();
    
    try {
      switch(opcao) {
        case '1':
          await listarTodasViagens();
          mostrarMenu();
          break;
        case '2':
          await consultarDiario();
          mostrarMenu();
          break;
        case '3':
          await listarParadasTodas();
          mostrarMenu();
          break;
        case '4':
          await listarCustosTodos();
          mostrarMenu();
          break;
        case '5':
          await estatisticasGerais();
          mostrarMenu();
          break;
        case '6':
          await detalhesViagem();
          break;
        case '0':
          console.log('\n👋 Até logo!\n');
          process.exit(0);
          break;
        default:
          console.log('\n❌ Opção inválida!\n');
          mostrarMenu();
      }
    } catch (error) {
      console.error('\n❌ Erro:', error.message);
      mostrarMenu();
    }
  });
}

async function main() {
  console.log('🔥 Inicializando Firebase...');
  initializeFirebase();
  db = getFirestore();
  console.log('✅ Firebase conectado!');
  
  mostrarMenu();
}

main();
