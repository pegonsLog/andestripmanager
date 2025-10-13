import { Injectable } from '@angular/core';
import {
    Storage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    uploadBytesResumable,
    UploadTaskSnapshot
} from '@angular/fire/storage';
import { Observable, from, map, switchMap } from 'rxjs';

/**
 * Interface para resultado do upload
 */
export interface UploadResult {
    url: string;
    path: string;
    size: number;
    name: string;
}

/**
 * Interface para progresso do upload
 */
export interface UploadProgress {
    progress: number;
    bytesTransferred: number;
    totalBytes: number;
    state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    constructor(private storage: Storage) { }

    /**
     * Faz upload de uma imagem com compressão automática
     */
    uploadImage(
        file: File,
        path: string,
        maxWidth: number = 1920,
        maxHeight: number = 1080,
        quality: number = 0.8
    ): Observable<UploadResult> {
        return from(this.compressImage(file, maxWidth, maxHeight, quality)).pipe(
            switchMap(compressedFile => this.uploadFile(compressedFile, path))
        );
    }

    /**
     * Faz upload de um arquivo
     */
    uploadFile(file: File, path: string): Observable<UploadResult> {
        const storageRef = ref(this.storage, path);

        return from(uploadBytes(storageRef, file)).pipe(
            switchMap(snapshot => from(getDownloadURL(snapshot.ref))),
            map(url => ({
                url,
                path,
                size: file.size,
                name: file.name
            }))
        );
    }

    /**
     * Faz upload com progresso
     */
    uploadFileWithProgress(file: File, path: string): Observable<UploadProgress | UploadResult> {
        const storageRef = ref(this.storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Observable(observer => {
            uploadTask.on('state_changed',
                (snapshot: UploadTaskSnapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    observer.next({
                        progress,
                        bytesTransferred: snapshot.bytesTransferred,
                        totalBytes: snapshot.totalBytes,
                        state: snapshot.state as any
                    });
                },
                (error) => {
                    console.error('Erro no upload:', error);
                    observer.error(error);
                },
                async () => {
                    try {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        observer.next({
                            url,
                            path,
                            size: file.size,
                            name: file.name
                        } as UploadResult);
                        observer.complete();
                    } catch (error) {
                        observer.error(error);
                    }
                }
            );
        });
    }

    /**
     * Remove um arquivo do storage
     */
    deleteFile(path: string): Observable<void> {
        const storageRef = ref(this.storage, path);
        return from(deleteObject(storageRef));
    }

    /**
     * Extrai o path do storage a partir da URL
     */
    extractPathFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
            return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
        } catch {
            return null;
        }
    }

    /**
     * Comprime uma imagem
     */
    private compressImage(
        file: File,
        maxWidth: number,
        maxHeight: number,
        quality: number
    ): Promise<File> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();

            img.onload = () => {
                // Calcular novas dimensões mantendo proporção
                const { width, height } = this.calculateDimensions(
                    img.width,
                    img.height,
                    maxWidth,
                    maxHeight
                );

                canvas.width = width;
                canvas.height = height;

                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file); // Fallback para arquivo original
                    }
                }, file.type, quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Calcula dimensões mantendo proporção
     */
    private calculateDimensions(
        originalWidth: number,
        originalHeight: number,
        maxWidth: number,
        maxHeight: number
    ): { width: number; height: number } {
        let width = originalWidth;
        let height = originalHeight;

        // Se a imagem é menor que os limites, manter tamanho original
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }

        // Calcular proporção
        const aspectRatio = width / height;

        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }

        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    /**
     * Valida se o arquivo é uma imagem válida
     */
    isValidImage(file: File): boolean {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        return validTypes.includes(file.type) && file.size <= maxSize;
    }

    /**
     * Gera um path único para o arquivo
     */
    generatePath(folder: string, fileName: string): string {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const extension = fileName.split('.').pop();
        const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

        return `${folder}/${timestamp}_${randomId}_${cleanName}`;
    }

    /**
     * Converte bytes para formato legível
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}