#!/usr/bin/env node

import { initializeFirebase } from './dist/firebase.js';
import { listarParadas } from './dist/resources.js';

const VIAGEM_TESTE_ID = 'RTAFGrbxjc2l3dajgguN';

async function consultarParadasTeste() {
  try {
    console.log('🔥 Inicializando Firebase...');
    initializeFirebase();
    
    console.log(`\n📍 Consultando paradas da viagem "teste" (ID: ${VIAGEM_TESTE_ID})\n`);
    
    const paradas = await listarParadas(VIAGEM_TESTE_ID);
    
    console.log(`✅ Encontradas ${paradas.length} parada(s):\n`);
    
    if (paradas.length === 0) {
      console.log('❌ Nenhuma parada cadastrada para esta viagem.\n');
      return;
    }
    
    paradas.forEach((p, index) => {
      console.log(`${index + 1}. ${p.tipo}: ${p.nome}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Endereço: ${p.endereco || 'N/A'}`);
      console.log(`   Chegada: ${p.horaChegada || 'N/A'}`);
      console.log(`   Saída: ${p.horaSaida || 'N/A'}`);
      console.log(`   Duração: ${p.duracao || 'N/A'} minutos`);
      console.log(`   Custo: R$ ${p.custo || 0}`);
      console.log(`   Coordenadas: ${p.coordenadas ? `[${p.coordenadas[0]}, ${p.coordenadas[1]}]` : 'N/A'}`);
      console.log(`   Observações: ${p.observacoes || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

consultarParadasTeste();
