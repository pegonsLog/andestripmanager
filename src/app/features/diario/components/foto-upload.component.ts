import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

/**
 * Componente para upload de fotos do diário
 * Permite selecionar múltiplas fotos e fazer upload
 */
@Component({
    selector: 'app-foto-upload',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule
    ],
    template: `
    <div class="foto-upload-container">
      <!-- Área de drop -->
      <div 
        class="drop-zone"
        [class.drag-over]="isDragOver"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">
        
        <mat-icon class="upload-icon">cloud_upload</mat-icon>
        <p class="upload-text">
          Arraste fotos aqui ou clique para selecionar
        </p>
        <p class="upload-hint">
          Formatos aceitos: JPG, PNG, WEBP (máx. 5MB cada)
        </p>
      </div>

      <!-- Input de arquivo oculto -->
      <input
        #fileInput
        type="file"
        multiple
        accept="image/*"
        (change)="onFileSelected($event)"
        style="display: none;">

      <!-- Preview das fotos selecionadas -->
      <div class="fotos-preview" *ngIf="fotosSelecionadas.length > 0">
        <h4>Fotos selecionadas ({{ fotosSelecionadas.length }})</h4>
        
        <div class="preview-grid">
          <div 
            class="preview-item" 
            *ngFor="let foto of fotosSelecionadas; let i = index">
            
            <img [src]="foto.preview" [alt]="foto.file.name" class="preview-image">
            
            <div class="preview-overlay">
              <button 
                mat-icon-button 
                color="warn"
                (click)="removerFoto(i)"
                class="btn-remover">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="preview-info">
              <span class="nome-arquivo">{{ foto.file.name }}</span>
              <span class="tamanho-arquivo">{{ formatarTamanho(foto.file.size) }}</span>
            </div>
          </div>
        </div>

        <!-- Barra de progresso durante upload -->
        <div class="upload-progress" *ngIf="isUploading$ | async">
          <mat-progress-bar mode="determinate" [value]="progressoUpload$ | async"></mat-progress-bar>
          <p>Enviando fotos... {{ progressoUpload$ | async }}%</p>
        </div>

        <!-- Botões de ação -->
        <div class="acoes-container">
          <button 
            mat-button 
            (click)="limparFotos()"
            [disabled]="isUploading$ | async">
            Limpar Todas
          </button>
          
          <button 
            mat-raised-button 
            color="primary"
            (click)="confirmarFotos()"
            [disabled]="isUploading$ | async || fotosSelecionadas.length === 0">
            <mat-icon>check</mat-icon>
            Adicionar Fotos ({{ fotosSelecionadas.length }})
          </button>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./foto-upload.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FotoUploadComponent {
    @Input() maxFiles = 10;
    @Input() maxFileSize = 5 * 1024 * 1024; // 5MB
    @Output() fotosAdicionadas = new EventEmitter<File[]>();

    private snackBar = inject(MatSnackBar);

    fotosSelecionadas: { file: File; preview: string }[] = [];
    isDragOver = false;
    isUploading$ = new BehaviorSubject<boolean>(false);
    progressoUpload$ = new BehaviorSubject<number>(0);

    /**
     * Manipula o evento de arrastar sobre a área de drop
     */
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = true;
    }

    /**
     * Manipula o evento de sair da área de drop
     */
    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
    }

    /**
     * Manipula o evento de soltar arquivos na área de drop
     */
    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;

        const files = event.dataTransfer?.files;
        if (files) {
            this.processarArquivos(Array.from(files));
        }
    }

    /**
     * Manipula a seleção de arquivos via input
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.processarArquivos(Array.from(input.files));
        }
    }

    /**
     * Processa os arquivos selecionados
     */
    private processarArquivos(files: File[]): void {
        const fotosValidas: File[] = [];

        for (const file of files) {
            // Verificar se é imagem
            if (!file.type.startsWith('image/')) {
                this.snackBar.open(`${file.name} não é uma imagem válida`, 'Fechar', { duration: 3000 });
                continue;
            }

            // Verificar tamanho
            if (file.size > this.maxFileSize) {
                this.snackBar.open(
                    `${file.name} é muito grande (máx. ${this.formatarTamanho(this.maxFileSize)})`,
                    'Fechar',
                    { duration: 3000 }
                );
                continue;
            }

            // Verificar se já foi adicionada
            if (this.fotosSelecionadas.some(foto => foto.file.name === file.name && foto.file.size === file.size)) {
                this.snackBar.open(`${file.name} já foi adicionada`, 'Fechar', { duration: 3000 });
                continue;
            }

            fotosValidas.push(file);
        }

        // Verificar limite de arquivos
        if (this.fotosSelecionadas.length + fotosValidas.length > this.maxFiles) {
            const fotosPermitidas = this.maxFiles - this.fotosSelecionadas.length;
            fotosValidas.splice(fotosPermitidas);
            this.snackBar.open(
                `Limite de ${this.maxFiles} fotos. Apenas ${fotosPermitidas} foram adicionadas.`,
                'Fechar',
                { duration: 3000 }
            );
        }

        // Criar previews
        fotosValidas.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.fotosSelecionadas.push({
                    file,
                    preview: e.target?.result as string
                });
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Remove uma foto da seleção
     */
    removerFoto(index: number): void {
        this.fotosSelecionadas.splice(index, 1);
    }

    /**
     * Limpa todas as fotos selecionadas
     */
    limparFotos(): void {
        this.fotosSelecionadas = [];
    }

    /**
     * Confirma e emite as fotos selecionadas
     */
    confirmarFotos(): void {
        const arquivos = this.fotosSelecionadas.map(foto => foto.file);
        this.fotosAdicionadas.emit(arquivos);
        this.limparFotos();
    }

    /**
     * Formata o tamanho do arquivo para exibição
     */
    formatarTamanho(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}