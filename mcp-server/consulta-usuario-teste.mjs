#!/usr/bin/env node

import { initializeFirebase } from './dist/firebase.js';
import { listarViagens } from './dist/resources.js';

const USUARIO_TESTE_ID = 'hBkb4hW3Q7Pf2Z3OX6gF34TE8dr1';

async function consultarUsuarioTeste() {
  try {
    console.log('🔥 Inicializando Firebase...');
    initializeFirebase();
    
    console.log(`\n📊 Consultando viagens do usuário: ${USUARIO_TESTE_ID}\n`);
    
    const viagens = await listarViagens(USUARIO_TESTE_ID);
    
    console.log(`✅ Encontradas ${viagens.length} viagem(ns):\n`);
    
    viagens.forEach((v, index) => {
      console.log(`${index + 1}. 🚗 ${v.nome || 'Sem nome'}`);
      console.log(`   ID: ${v.id}`);
      console.log(`   Origem: ${v.origem || 'N/A'} → Destino: ${v.destino || 'N/A'}`);
      console.log(`   Status: ${v.status || 'N/A'}`);
      console.log(`   Período: ${v.dataInicio} até ${v.dataFim}`);
      console.log(`   Distância: ${v.distanciaTotal || 'N/A'} km`);
      console.log(`   Custo total: R$ ${v.custoTotal || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

consultarUsuarioTeste();
