/**
 * Configuração e inicialização do Firebase Admin SDK
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let firebaseInitialized = false;

/**
 * Inicializa o Firebase Admin SDK
 */
export function initializeFirebase(): void {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Tenta carregar credenciais do arquivo
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
    const absolutePath = resolve(serviceAccountPath);
    
    try {
      const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      console.log('✅ Firebase inicializado com arquivo de credenciais');
    } catch (fileError) {
      // Se falhar, tenta usar variáveis de ambiente
      if (process.env.FIREBASE_PROJECT_ID && 
          process.env.FIREBASE_CLIENT_EMAIL && 
          process.env.FIREBASE_PRIVATE_KEY) {
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
        
        console.log('✅ Firebase inicializado com variáveis de ambiente');
      } else {
        throw new Error(
          'Credenciais do Firebase não encontradas. ' +
          'Configure FIREBASE_SERVICE_ACCOUNT_PATH ou as variáveis de ambiente.'
        );
      }
    }
    
    firebaseInitialized = true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    throw error;
  }
}

/**
 * Retorna a instância do Firestore
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return admin.firestore();
}

/**
 * Retorna a instância do Storage
 */
export function getStorage(): admin.storage.Storage {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return admin.storage();
}
