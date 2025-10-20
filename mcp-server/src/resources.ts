/**
 * Implementação dos recursos MCP para expor dados do Firestore
 */
import { getFirestore } from './firebase.js';
import { Viagem, Parada, Custo, DiaViagem } from './types.js';

/**
 * Lista todas as viagens de um usuário
 */
export async function listarViagens(usuarioId: string): Promise<Viagem[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('viagens')
    .where('usuarioId', '==', usuarioId)
    .orderBy('dataInicio', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Viagem));
}

/**
 * Obtém uma viagem específica
 */
export async function obterViagem(viagemId: string): Promise<Viagem | null> {
  const db = getFirestore();
  const doc = await db.collection('viagens').doc(viagemId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data()
  } as Viagem;
}

/**
 * Lista todas as paradas de uma viagem
 */
export async function listarParadas(viagemId: string): Promise<Parada[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('paradas')
    .where('viagemId', '==', viagemId)
    .orderBy('horaChegada', 'asc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Parada));
}

/**
 * Obtém uma parada específica
 */
export async function obterParada(paradaId: string): Promise<Parada | null> {
  const db = getFirestore();
  const doc = await db.collection('paradas').doc(paradaId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data()
  } as Parada;
}

/**
 * Lista todos os custos de uma viagem
 */
export async function listarCustos(viagemId: string): Promise<Custo[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('custos')
    .where('viagemId', '==', viagemId)
    .orderBy('data', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Custo));
}

/**
 * Obtém um custo específico
 */
export async function obterCusto(custoId: string): Promise<Custo | null> {
  const db = getFirestore();
  const doc = await db.collection('custos').doc(custoId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data()
  } as Custo;
}

/**
 * Lista todos os dias de uma viagem
 */
export async function listarDiasViagem(viagemId: string): Promise<DiaViagem[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('diasViagem')
    .where('viagemId', '==', viagemId)
    .orderBy('numero', 'asc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as DiaViagem));
}

/**
 * Obtém um dia de viagem específico
 */
export async function obterDiaViagem(diaId: string): Promise<DiaViagem | null> {
  const db = getFirestore();
  const doc = await db.collection('diasViagem').doc(diaId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data()
  } as DiaViagem;
}

/**
 * Busca viagens por status
 */
export async function buscarViagensPorStatus(usuarioId: string, status: string): Promise<Viagem[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('viagens')
    .where('usuarioId', '==', usuarioId)
    .where('status', '==', status)
    .orderBy('dataInicio', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Viagem));
}

/**
 * Busca paradas por tipo
 */
export async function buscarParadasPorTipo(viagemId: string, tipo: string): Promise<Parada[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('paradas')
    .where('viagemId', '==', viagemId)
    .where('tipo', '==', tipo)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Parada));
}

/**
 * Busca custos por categoria
 */
export async function buscarCustosPorCategoria(viagemId: string, categoria: string): Promise<Custo[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('custos')
    .where('viagemId', '==', viagemId)
    .where('categoria', '==', categoria)
    .orderBy('data', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Custo));
}
