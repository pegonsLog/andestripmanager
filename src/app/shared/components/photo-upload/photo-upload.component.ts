import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

// Services
import { UploadService, UploadResult, UploadProgress } from '../../../core/services/upload.service';

/**
 * Interface para foto
 */
export interface Photo {
    id?: string;
    url: string;
    path: string;
    name: string;
    size: number;
    uploadedAt?: Date;
}

@Component({
    selector: 'app-photo-upload',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        MatSnackBarModule,
        MatCardModule,
        MatTooltipModule,
        MatDialogModule
    ],
    templateUrl: './photo-upload.component.html',
    styleUrls: ['./photo-upload.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhotoUploadComponent {
    @Input() photos: Photo[] = [];
    @Input() maxPhotos: number = 10;
    @Input() uploadPath: string = 'photos';
    @Input() allowMultiple: boolean = true;
    @Input() disabled: boolean = false;
    @Input() showGallery: boolean = true;
    @Input() compactMode: boolean = false;

    @Output() photosChange = new EventEmitter<Photo[]>();
    @Output() photoAdded = new EventEmitter<Photo>();
    @Output() photoRemoved = new EventEmitter<Photo>();
    @Output() uploadProgress = new EventEmitter<number>();

    private uploadService = inject(UploadService);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    // Estado do componente
    isUploading = false;
    uploadProgressValue = 0;
    dragOver = false;

    /**
     * Manipula seleção de arquivos
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.handleFiles(Array.from(input.files));
        }
        // Limpar input para permitir seleção do mesmo arquivo novamente
        input.value = '';
    }

    /**
     * Manipula drag and drop
     */
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOver = false;

        if (event.dataTransfer?.files) {
            this.handleFiles(Array.from(event.dataTransfer.files));
        }
    }

    /**
     * Processa arquivos selecionados
     */
    private handleFiles(files: File[]): void {
        if (this.disabled || this.isUploading) return;

        // Filtrar apenas imagens válidas
        const validFiles = files.filter(file => {
            if (!this.uploadService.isValidImage(file)) {
                this.showError(`Arquivo ${file.name} não é uma imagem válida ou é muito grande (máx. 10MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Verificar limite de fotos
        const remainingSlots = this.maxPhotos - this.photos.length;
        if (remainingSlots <= 0) {
            this.showError(`Limite máximo de ${this.maxPhotos} fotos atingido`);
            return;
        }

        // Limitar arquivos ao número de slots disponíveis
        const filesToUpload = validFiles.slice(0, remainingSlots);

        if (filesToUpload.length < validFiles.length) {
            this.showWarning(`Apenas ${filesToUpload.length} fotos foram selecionadas devido ao limite`);
        }

        // Fazer upload dos arquivos
        this.uploadFiles(filesToUpload);
    }

    /**
     * Faz upload dos arquivos
     */
    private async uploadFiles(files: File[]): Promise<void> {
        this.isUploading = true;
        this.uploadProgressValue = 0;

        try {
            const uploadPromises = files.map((file, index) =>
                this.uploadSingleFile(file, index, files.length)
            );

            await Promise.all(uploadPromises);
            this.showSuccess(`${files.length} foto(s) enviada(s) com sucesso!`);
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showError('Erro ao enviar fotos. Tente novamente.');
        } finally {
            this.isUploading = false;
            this.uploadProgressValue = 0;
            this.uploadProgress.emit(0);
        }
    }

    /**
     * Faz upload de um arquivo individual
     */
    private uploadSingleFile(file: File, index: number, total: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const path = this.uploadService.generatePath(this.uploadPath, file.name);

            this.uploadService.uploadFileWithProgress(file, path).subscribe({
                next: (result) => {
                    if ('progress' in result) {
                        // Atualizar progresso geral
                        const fileProgress = result.progress / total;
                        const totalProgress = (index * 100 + result.progress) / total;
                        this.uploadProgressValue = totalProgress;
                        this.uploadProgress.emit(totalProgress);
                    } else {
                        // Upload concluído
                        const photo: Photo = {
                            url: result.url,
                            path: result.path,
                            name: result.name,
                            size: result.size,
                            uploadedAt: new Date()
                        };

                        this.addPhoto(photo);
                        resolve();
                    }
                },
                error: (error) => {
                    console.error('Erro no upload do arquivo:', file.name, error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Adiciona foto à lista
     */
    private addPhoto(photo: Photo): void {
        const updatedPhotos = [...this.photos, photo];
        this.photos = updatedPhotos;
        this.photosChange.emit(updatedPhotos);
        this.photoAdded.emit(photo);
    }

    /**
     * Remove foto da lista
     */
    removePhoto(photo: Photo): void {
        if (this.disabled) return;

        const confirmacao = confirm('Deseja realmente remover esta foto?');
        if (!confirmacao) return;

        // Remover do storage
        if (photo.path) {
            this.uploadService.deleteFile(photo.path).subscribe({
                next: () => {
                    console.log('Foto removida do storage:', photo.path);
                },
                error: (error) => {
                    console.error('Erro ao remover foto do storage:', error);
                }
            });
        }

        // Remover da lista
        const updatedPhotos = this.photos.filter(p => p.url !== photo.url);
        this.photos = updatedPhotos;
        this.photosChange.emit(updatedPhotos);
        this.photoRemoved.emit(photo);

        this.showSuccess('Foto removida com sucesso!');
    }

    /**
     * Abre foto em tela cheia
     */
    openPhoto(photo: Photo): void {
        // Implementar modal de visualização de foto
        window.open(photo.url, '_blank');
    }

    /**
     * Verifica se pode adicionar mais fotos
     */
    canAddMorePhotos(): boolean {
        return !this.disabled && this.photos.length < this.maxPhotos && !this.isUploading;
    }

    /**
     * Obtém texto do botão de upload
     */
    getUploadButtonText(): string {
        if (this.isUploading) {
            return 'Enviando...';
        }

        if (this.photos.length === 0) {
            return this.allowMultiple ? 'Adicionar Fotos' : 'Adicionar Foto';
        }

        const remaining = this.maxPhotos - this.photos.length;
        if (remaining === 1) {
            return 'Adicionar 1 Foto';
        }

        return `Adicionar Fotos (${remaining} restantes)`;
    }

    /**
     * Formata tamanho do arquivo
     */
    formatFileSize(bytes: number): string {
        return this.uploadService.formatFileSize(bytes);
    }

    /**
     * Exibe mensagem de sucesso
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Exibe mensagem de erro
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }

    /**
     * Exibe mensagem de aviso
     */
    private showWarning(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 4000,
            panelClass: ['warning-snackbar']
        });
    }

    /**
     * TrackBy function para performance da lista
     */
    trackByUrl(index: number, photo: Photo): string {
        return photo.url;
    }
}