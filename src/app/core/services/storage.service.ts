import { Injectable } from '@angular/core';
import {
    Storage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from '@angular/fire/storage';
import { Observable, from } from 'rxjs';

/**
 * Serviço para gerenciamento de arquivos no Firebase Storage
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    constructor(private storage: Storage) { }

    /**
     * Faz upload de foto de perfil do usuário
     * @param userId ID do usuário
     * @param file Arquivo de imagem
     * @returns Observable com URL da imagem
     */
    uploadProfilePhoto(userId: string, file: File): Observable<string> {
        const filePath = `usuarios/${userId}/perfil.jpg`;
        const storageRef = ref(this.storage, filePath);

        return from(
            uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef))
        );
    }

    /**
     * Remove foto de perfil do usuário
     * @param userId ID do usuário
     * @returns Observable de conclusão
     */
    deleteProfilePhoto(userId: string): Observable<void> {
        const filePath = `usuarios/${userId}/perfil.jpg`;
        const storageRef = ref(this.storage, filePath);

        return from(deleteObject(storageRef));
    }

    /**
     * Faz upload de foto de parada
     * @param paradaId ID da parada
     * @param file Arquivo de imagem
     * @param index Índice da foto (para múltiplas fotos)
     * @returns Observable com URL da imagem
     */
    uploadParadaPhoto(paradaId: string, file: File, index: number): Observable<string> {
        const timestamp = Date.now();
        const filePath = `paradas/${paradaId}/foto_${index}_${timestamp}.jpg`;
        const storageRef = ref(this.storage, filePath);

        return from(
            uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef))
        );
    }

    /**
     * Faz upload de foto de hospedagem
     * @param hospedagemId ID da hospedagem
     * @param file Arquivo de imagem
     * @param index Índice da foto
     * @returns Observable com URL da imagem
     */
    uploadHospedagemPhoto(hospedagemId: string, file: File, index: number): Observable<string> {
        const timestamp = Date.now();
        const filePath = `hospedagens/${hospedagemId}/foto_${index}_${timestamp}.jpg`;
        const storageRef = ref(this.storage, filePath);

        return from(
            uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef))
        );
    }

    /**
     * Faz upload de foto do diário de bordo
     * @param diarioId ID do diário
     * @param file Arquivo de imagem
     * @param index Índice da foto
     * @returns Observable com URL da imagem
     */
    uploadDiarioPhoto(diarioId: string, file: File, index: number): Observable<string> {
        const timestamp = Date.now();
        const filePath = `diario/${diarioId}/foto_${index}_${timestamp}.jpg`;
        const storageRef = ref(this.storage, filePath);

        return from(
            uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef))
        );
    }

    /**
     * Faz upload de comprovante de custo
     * @param custoId ID do custo
     * @param file Arquivo (imagem ou PDF)
     * @returns Observable com URL do arquivo
     */
    uploadComprovantePhoto(custoId: string, file: File): Observable<string> {
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const filePath = `custos/${custoId}/comprovante_${timestamp}.${extension}`;
        const storageRef = ref(this.storage, filePath);

        return from(
            uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef))
        );
    }

    /**
     * Remove arquivo do Storage
     * @param url URL completa do arquivo
     * @returns Observable de conclusão
     */
    deleteFile(url: string): Observable<void> {
        const storageRef = ref(this.storage, url);
        return from(deleteObject(storageRef));
    }

    /**
     * Comprime imagem antes do upload
     * @param file Arquivo de imagem
     * @param maxWidth Largura máxima
     * @param maxHeight Altura máxima
     * @param quality Qualidade (0-1)
     * @returns Promise com arquivo comprimido
     */
    compressImage(
        file: File,
        maxWidth: number = 800,
        maxHeight: number = 600,
        quality: number = 0.8
    ): Promise<File> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();

            img.onload = () => {
                // Calcular dimensões mantendo proporção
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para blob
                canvas.toBlob(
                    (blob) => {
                        const compressedFile = new File([blob!], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    },
                    file.type,
                    quality
                );
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Valida arquivo de imagem
     * @param file Arquivo a ser validado
     * @returns Objeto com resultado da validação
     */
    validateImageFile(file: File): { valid: boolean; error?: string } {
        // Verificar tipo
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Arquivo deve ser uma imagem' };
        }

        // Verificar tamanho (máximo 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: 'Imagem deve ter no máximo 10MB' };
        }

        // Verificar tipos permitidos
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Formato não suportado. Use JPEG, PNG ou WebP' };
        }

        return { valid: true };
    }
}