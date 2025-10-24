#!/usr/bin/env node

/**
 * Script de teste para consultar viagens do Firebase
 */

import { initializeFirebase, getFirestore } from './dist/firebase.js';

async function listarTodasViagens() {
  try {
    console.log('🔍 Inicializando Firebase...');
    initializeFirebase();
    
    const db = getFirestore();
    
    console.log('📊 Buscando todas as viagens...\n');
    
    // Lista todas as viagens (sem filtro de usuário)
    const snapshot = await db
      .collection('viagens')
      .orderBy('dataInicio', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma viagem encontrada no banco de dados.');
      console.log('💡 Dica: Cadastre algumas viagens no app AndesTripManager primeiro.\n');
      return;
    }
    
    console.log(`✅ Encontradas ${snapshot.size} viagem(ns):\n`);
    
    snapshot.docs.forEach((doc, index) => {
      const viagem = doc.data();
      console.log(`${index + 1}. 🚗 ${viagem.nome || 'Sem nome'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Usuário: ${viagem.usuarioId || 'N/A'}`);
      console.log(`   Origem: ${viagem.origem || 'N/A'}`);
      console.log(`   Destino: ${viagem.destino || 'N/A'}`);
      console.log(`   Status: ${viagem.status || 'N/A'}`);
      console.log(`   Data início: ${viagem.dataInicio || 'N/A'}`);
      console.log(`   Data fim: ${viagem.dataFim || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar viagens:', error.message);
  }
}

// Executa
listarTodasViagens();
