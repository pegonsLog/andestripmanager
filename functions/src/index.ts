import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import type { Request, Response } from 'express';

// Inicializa Admin SDK
initializeApp();

// Define região padrão para alinhar com Firestore (southamerica-east1)
setGlobalOptions({ region: 'southamerica-east1' });

// Função HTTP simples para validar deploy
export const helloWorld = onRequest((req: Request, res: Response) => {
  res.status(200).send('Functions up and running.');
});
