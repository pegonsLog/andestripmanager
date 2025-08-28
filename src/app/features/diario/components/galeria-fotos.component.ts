import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

/**
 * Interface para dados da foto na galeria
 */
interface FotoGaleria {
    url: string;
    nome?: string;
    data?: string;
    descricao?: string;
}

/**
 * Componente para visualização de galeria de fotos
 * Permite visualizar fotos em grid e em tela cheia
 */
@Component({
    selector: 'app-galeria-fotos',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule
    ],
    template: `
    <div class="galeria-container">
      <!-- Cabeçalho da galeria -->
      <div class="galeria-header" *ngIf="titulo">
        <h3>{{ titulo }}</h3>
        <span class="contador-fotos">{{ fotos.length }} foto(s)</span>
      </div>

      <!-- Grid de fotos -->
      <div class="fotos-grid" *ngIf="fotos.length > 0">
        <div 
          class="foto-item"
          *ngFor="let foto of fotos; let i = index"
          (click)="abrirFotoTelaCheia(i)">
          
          <img 
            [src]="foto.url" 
            [alt]="foto.nome || 'Foto do diário'"
            class="foto-thumbnail"
            loading="lazy">
          
          <div class="foto-overlay">
            <mat-icon>zoom_in</mat-icon>
          </div>

          <!-- Botão de remoção (se permitido) -->
          <button 
            mat-icon-button
            class="btn-remover-foto"
            *ngIf="permitirRemocao"
            (click)="removerFoto(i, $event)"
            matTooltip="Remover foto">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Mensagem quando não há fotos -->
      <div class="sem-fotos" *ngIf="fotos.length === 0">
        <mat-icon class="sem-fotos-icon">photo</mat-icon>
        <p>Nenhuma foto adicionada</p>
        <button 
          mat-raised-button 
          color="primary"
          *ngIf="permitirAdicao"
          (click)="adicionarFotos.emit()">
          <mat-icon>add_photo_alternate</mat-icon>
          Adicionar Fotos
        </button>
      </div>

      <!-- Botão para adicionar mais fotos -->
      <div class="acoes-galeria" *ngIf="fotos.length > 0 && permitirAdicao">
        <button 
          mat-stroked-button 
          color="primary"
          (click)="adicionarFotos.emit()">
          <mat-icon>add_photo_alternate</mat-icon>
          Adicionar Mais Fotos
        </button>
      </div>
    </div>

    <!-- Modal de visualização em tela cheia -->
    <div 
      class="modal-foto-overlay"
      *ngIf="fotoTelaCheia$ | async as fotoAtual"
      (click)="fecharFotoTelaCheia()"
      (keydown.escape)="fecharFotoTelaCheia()">
      
      <div class="modal-foto-container" (click)="$event.stopPropagation()">
        <!-- Controles de navegação -->
        <div class="controles-navegacao">
          <button 
            mat-icon-button
            class="btn-anterior"
            (click)="fotoAnterior()"
            [disabled]="indiceAtual === 0">
            <mat-icon>chevron_left</mat-icon>
          </button>

          <span class="contador-modal">
            {{ indiceAtual + 1 }} de {{ fotos.length }}
          </span>

          <button 
            mat-icon-button
            class="btn-proximo"
            (click)="proximaFoto()"
            [disabled]="indiceAtual === fotos.length - 1">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>

        <!-- Imagem em tela cheia -->
        <div class="foto-tela-cheia">
          <img 
            [src]="fotoAtual.url" 
            [alt]="fotoAtual.nome || 'Foto do diário'"
            class="foto-modal">
        </div>

        <!-- Informações da foto -->
        <div class="info-foto" *ngIf="fotoAtual.nome || fotoAtual.data || fotoAtual.descricao">
          <h4 *ngIf="fotoAtual.nome">{{ fotoAtual.nome }}</h4>
          <p *ngIf="fotoAtual.data" class="data-foto">{{ fotoAtual.data }}</p>
          <p *ngIf="fotoAtual.descricao" class="descricao-foto">{{ fotoAtual.descricao }}</p>
        </div>

        <!-- Botões de ação -->
        <div class="acoes-modal">
          <button 
            mat-icon-button
            (click)="compartilharFoto(fotoAtual)"
            matTooltip="Compartilhar">
            <mat-icon>share</mat-icon>
          </button>

          <button 
            mat-icon-button
            (click)="baixarFoto(fotoAtual)"
            matTooltip="Baixar">
            <mat-icon>download</mat-icon>
          </button>

          <button 
            mat-icon-button
            class="btn-fechar"
            (click)="fecharFotoTelaCheia()"
            matTooltip="Fechar">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./galeria-fotos.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GaleriaFotosComponent {
    @Input() fotos: FotoGaleria[] = [];
    @Input() titulo?: string;
    @Input() permitirRemocao = false;
    @Input() permitirAdicao = false;
    @Output() fotoRemovida = new EventEmitter<number>();
    @Output() adicionarFotos = new EventEmitter<void>();

    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    fotoTelaCheia$ = new BehaviorSubject<FotoGaleria | null>(null);
    indiceAtual = 0;

    /**
     * Abre uma foto em tela cheia
     */
    abrirFotoTelaCheia(indice: number): void {
        this.indiceAtual = indice;
        this.fotoTelaCheia$.next(this.fotos[indice]);

        // Prevenir scroll do body
        document.body.style.overflow = 'hidden';
    }

    /**
     * Fecha a visualização em tela cheia
     */
    fecharFotoTelaCheia(): void {
        this.fotoTelaCheia$.next(null);

        // Restaurar scroll do body
        document.body.style.overflow = 'auto';
    }

    /**
     * Navega para a foto anterior
     */
    fotoAnterior(): void {
        if (this.indiceAtual > 0) {
            this.indiceAtual--;
            this.fotoTelaCheia$.next(this.fotos[this.indiceAtual]);
        }
    }

    /**
     * Navega para a próxima foto
     */
    proximaFoto(): void {
        if (this.indiceAtual < this.fotos.length - 1) {
            this.indiceAtual++;
            this.fotoTelaCheia$.next(this.fotos[this.indiceAtual]);
        }
    }

    /**
     * Remove uma foto da galeria
     */
    removerFoto(indice: number, event: Event): void {
        event.stopPropagation();

        const confirmacao = confirm('Tem certeza que deseja remover esta foto?');
        if (confirmacao) {
            this.fotoRemovida.emit(indice);
        }
    }

    /**
     * Compartilha uma foto
     */
    async compartilharFoto(foto: FotoGaleria): Promise<void> {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: foto.nome || 'Foto do diário',
                    text: foto.descricao || 'Compartilhando foto do diário de viagem',
                    url: foto.url
                });
            } catch (error) {
                console.log('Compartilhamento cancelado');
            }
        } else {
            // Fallback: copiar URL para clipboard
            try {
                await navigator.clipboard.writeText(foto.url);
                this.snackBar.open('Link da foto copiado!', 'Fechar', { duration: 2000 });
            } catch (error) {
                this.snackBar.open('Erro ao copiar link', 'Fechar', { duration: 2000 });
            }
        }
    }

    /**
     * Baixa uma foto
     */
    baixarFoto(foto: FotoGaleria): void {
        const link = document.createElement('a');
        link.href = foto.url;
        link.download = foto.nome || 'foto-diario.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Manipula eventos de teclado para navegação
     */
    onKeyDown(event: KeyboardEvent): void {
        if (!this.fotoTelaCheia$.value) return;

        switch (event.key) {
            case 'ArrowLeft':
                this.fotoAnterior();
                break;
            case 'ArrowRight':
                this.proximaFoto();
                break;
            case 'Escape':
                this.fecharFotoTelaCheia();
                break;
        }
    }
}