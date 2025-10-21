#!/usr/bin/env node

import { initializeFirebase } from './dist/firebase.js';
import { listarViagens, listarParadas } from './dist/resources.js';

const USUARIO_TESTE_ID = 'hBkb4hW3Q7Pf2Z3OX6gF34TE8dr1';

async function consultarPrimeiraParada() {
  try {
    console.log('🔥 Inicializando Firebase...');
    initializeFirebase();
    
    console.log('\n🔍 Buscando viagem do usuário "teste"...\n');
    
    const viagens = await listarViagens(USUARIO_TESTE_ID);
    
    if (viagens.length === 0) {
      console.log('❌ Nenhuma viagem encontrada para o usuário teste.\n');
      return;
    }
    
    const viagem = viagens[0];
    console.log(`✅ Viagem encontrada: ${viagem.nome}\n`);
    
    console.log('📍 Buscando paradas...\n');
    const paradas = await listarParadas(viagem.id);
    
    if (paradas.length === 0) {
      console.log('❌ Esta viagem não possui nenhuma parada cadastrada.\n');
      return;
    }
    
    // Ordenar por hora de chegada para garantir que é a primeira
    paradas.sort((a, b) => {
      if (a.horaChegada && b.horaChegada) {
        return a.horaChegada.localeCompare(b.horaChegada);
      }
      return 0;
    });
    
    const primeiraParada = paradas[0];
    
    console.log('🎯 PRIMEIRA PARADA:\n');
    console.log(`   Nome: ${primeiraParada.nome}`);
    console.log(`   Tipo: ${primeiraParada.tipo}`);
    console.log(`   Endereço: ${primeiraParada.endereco || 'N/A'}`);
    console.log(`   Hora de chegada: ${primeiraParada.horaChegada || 'N/A'}`);
    console.log(`   Coordenadas: ${primeiraParada.coordenadas ? `[${primeiraParada.coordenadas[0]}, ${primeiraParada.coordenadas[1]}]` : 'N/A'}`);
    console.log('');
    
    console.log(`�� Total de paradas na viagem: ${paradas.length}\n`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

consultarPrimeiraParada();
