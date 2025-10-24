#!/usr/bin/env node

import { initializeFirebase, getFirestore } from './dist/firebase.js';
import { listarParadas } from './dist/resources.js';

async function consultarUsuarioPegons() {
  try {
    console.log('🔥 Inicializando Firebase...');
    initializeFirebase();
    
    const db = getFirestore();
    
    // Buscar usuário por email ou nome
    console.log('\n🔍 Buscando usuário "pegons.log"...\n');
    
    // Primeiro, listar todas as viagens para encontrar o usuário
    const viagensSnapshot = await db
      .collection('viagens')
      .get();
    
    console.log(`📊 Total de viagens no sistema: ${viagensSnapshot.size}\n`);
    
    // Buscar por email ou identificador que contenha "pegons"
    const usuariosEncontrados = new Map();
    
    viagensSnapshot.docs.forEach(doc => {
      const viagem = doc.data();
      const userId = viagem.usuarioId;
      
      if (!usuariosEncontrados.has(userId)) {
        usuariosEncontrados.set(userId, []);
      }
      usuariosEncontrados.get(userId).push({
        id: doc.id,
        nome: viagem.nome
      });
    });
    
    console.log('👥 Usuários encontrados:\n');
    
    for (const [userId, viagens] of usuariosEncontrados.entries()) {
      console.log(`Usuário ID: ${userId}`);
      console.log(`  Viagens: ${viagens.length}`);
      viagens.forEach(v => {
        console.log(`    - ${v.nome} (${v.id})`);
      });
      
      // Contar paradas de todas as viagens deste usuário
      let totalParadas = 0;
      for (const viagem of viagens) {
        const paradas = await listarParadas(viagem.id);
        totalParadas += paradas.length;
      }
      console.log(`  📍 Total de paradas: ${totalParadas}\n`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

consultarUsuarioPegons();
