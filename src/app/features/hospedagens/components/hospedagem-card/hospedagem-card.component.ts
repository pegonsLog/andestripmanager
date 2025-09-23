import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';

import { Hospedagem, TipoHospedagem } from '../../../../models';

@Component({
    selector: 'app-hospedagem-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTooltipModule,
        MatMenuModule,
        MatDividerModule,
        DatePipe
    ],
    templateUrl: './hospedagem-card.component.html',
    styleUrls: ['./hospedagem-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HospedagemCardComponent {
    @Input() hospedagem!: Hospedagem;
    @Input() showActions = true;
    @Input() showMap = false;

    @Output() editar = new EventEmitter<Hospedagem>();
    @Output() excluir = new EventEmitter<Hospedagem>();
    @Output() visualizar = new EventEmitter<Hospedagem>();
    @Output() verMapa = new EventEmitter<Hospedagem>();

    constructor(private dialog: MatDialog) { }

    onEditar(): void {
        this.editar.emit(this.hospedagem);
    }

    onExcluir(): void {
        this.excluir.emit(this.hospedagem);
    }

    onVisualizar(): void {
        this.visualizar.emit(this.hospedagem);
    }

    onVerMapa(): void {
        this.verMapa.emit(this.hospedagem);
    }

    getTipoHospedagemLabel(tipo: TipoHospedagem): string {
        const labels: Record<TipoHospedagem, string> = {
            [TipoHospedagem.HOTEL]: 'Hotel',
            [TipoHospedagem.POUSADA]: 'Pousada',
            [TipoHospedagem.HOSTEL]: 'Hostel',
            [TipoHospedagem.CAMPING]: 'Camping',
            [TipoHospedagem.CASA_TEMPORADA]: 'Casa de Temporada',
            [TipoHospedagem.APARTAMENTO]: 'Apartamento',
            [TipoHospedagem.OUTROS]: 'Outros'
        };
        return labels[tipo] || tipo;
    }

    getTipoIcon(tipo: TipoHospedagem): string {
        const icons: Record<TipoHospedagem, string> = {
            [TipoHospedagem.HOTEL]: 'hotel',
            [TipoHospedagem.POUSADA]: 'house',
            [TipoHospedagem.HOSTEL]: 'group',
            [TipoHospedagem.CAMPING]: 'nature',
            [TipoHospedagem.CASA_TEMPORADA]: 'home',
            [TipoHospedagem.APARTAMENTO]: 'apartment',
            [TipoHospedagem.OUTROS]: 'business'
        };
        return icons[tipo] || 'business';
    }

    getEstrelas(avaliacao?: number): number[] {
        const valor = avaliacao || 0;
        return Array(5).fill(0).map((_, i) => i < valor ? 1 : 0);
    }

    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    calcularDiasEstadia(): number {
        const checkIn = new Date(this.hospedagem.dataCheckIn);
        const checkOut = new Date(this.hospedagem.dataCheckOut);
        const diffTime = checkOut.getTime() - checkIn.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    abrirLink(url: string): void {
        if (url) {
            window.open(url, '_blank');
        }
    }

    temComodidades(): boolean {
        return !!(this.hospedagem.comodidades && this.hospedagem.comodidades.length > 0);
    }

    getComodidadesLimitadas(): string[] {
        if (!this.hospedagem.comodidades) return [];
        return this.hospedagem.comodidades.slice(0, 3);
    }

    getComodidadesRestantes(): number {
        if (!this.hospedagem.comodidades) return 0;
        return Math.max(0, this.hospedagem.comodidades.length - 3);
    }

    temFotos(): boolean {
        return !!(this.hospedagem.fotos && this.hospedagem.fotos.length > 0);
    }

    getPrimeiraFoto(): string | undefined {
        return this.hospedagem.fotos?.[0];
    }

    getQuantidadeFotos(): number {
        return this.hospedagem.fotos?.length || 0;
    }
}