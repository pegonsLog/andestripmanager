import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { DiarioBordo } from '../../../../models/diario-bordo.interface';

/**
 * Componente de card para exibir entrada de diário
 */
@Component({
    selector: 'app-diario-entrada-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatMenuModule,
        MatDividerModule
    ],
    templateUrl: './diario-entrada-card.component.html',
    styleUrls: ['./diario-entrada-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiarioEntradaCardComponent {
    @Input() entrada!: DiarioBordo;
    @Input() podeEditar = true;

    @Output() visualizar = new EventEmitter<DiarioBordo>();
    @Output() editar = new EventEmitter<DiarioBordo>();
    @Output() excluir = new EventEmitter<DiarioBordo>();

    /**
     * Formata data
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    /**
     * Obtém preview do conteúdo (primeiras linhas)
     */
    getPreviewConteudo(conteudo: string, maxLength: number = 200): string {
        if (conteudo.length <= maxLength) {
            return conteudo;
        }
        return conteudo.substring(0, maxLength) + '...';
    }

    /**
     * Remove tags HTML do conteúdo
     */
    stripHtml(html: string): string {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    /**
     * Emite evento de visualização
     */
    onVisualizar(): void {
        this.visualizar.emit(this.entrada);
    }

    /**
     * Emite evento de edição
     */
    onEditar(): void {
        this.editar.emit(this.entrada);
    }

    /**
     * Emite evento de exclusão
     */
    onExcluir(): void {
        this.excluir.emit(this.entrada);
    }

    /**
     * Retorna o ícone correto para cada tag
     */
    getIconeTag(tag: string): string {
        const tagsPredefinidas: { [key: string]: string } = {
            'aventura': 'explore',
            'trilha': 'hiking',
            'paisagem': 'landscape',
            'comida-local': 'restaurant',
            'memoravel': 'star',
            'natureza': 'park',
            'fotografia': 'photo_camera',
            'amigos': 'group',
            'familia': 'family_restroom',
            'cultura': 'museum',
            'historia': 'history_edu',
            'praia': 'beach_access',
            'montanha': 'terrain',
            'cidade': 'location_city',
            'desafio': 'emoji_events',
            'relaxamento': 'spa'
        };
        return tagsPredefinidas[tag] || 'label';
    }

    /**
     * Retorna o texto formatado para cada tag
     */
    getTextoTag(tag: string): string {
        const tagsFormatadas: { [key: string]: string } = {
            'aventura': 'Aventura',
            'trilha': 'Trilha',
            'paisagem': 'Paisagem',
            'comida-local': 'Comida Local',
            'memoravel': 'Memorável',
            'natureza': 'Natureza',
            'fotografia': 'Fotografia',
            'amigos': 'Amigos',
            'familia': 'Família',
            'cultura': 'Cultura',
            'historia': 'História',
            'praia': 'Praia',
            'montanha': 'Montanha',
            'cidade': 'Cidade',
            'desafio': 'Desafio',
            'relaxamento': 'Relaxamento'
        };
        return tagsFormatadas[tag] || tag;
    }
}
