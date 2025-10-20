import { Component, Inject, ViewChild, AfterViewInit, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { Parada } from '../../../models';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';

export interface ParadaDetailDialogData {
  parada: Parada;
  diaLabel: string;
}

@Component({
  selector: 'app-parada-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule, MatTabsModule],
  template: `
    <h5 mat-dialog-title class="title">
      <mat-icon class="tipo-icon">{{ getIconeParada(data.parada.tipo) }}</mat-icon>
      {{ data.parada.nome }}
    </h5>

    <div mat-dialog-content class="content">
      <div class="subinfo">
        <span class="dia">{{ data.diaLabel }}</span>
        <span class="sep">•</span>
        <span class="tipo">{{ getTipoParadaTexto(data.parada.tipo) }}</span>
      </div>

      <mat-tab-group class="tabs-container" (selectedTabChange)="onTabChange($event)">
        <!-- Aba de Informações -->
        <mat-tab label="Informações">
          <div class="tab-content">
            <div class="grid">
        <div class="grid-item" *ngIf="data.parada.horaChegada || data.parada.horaSaida">
          <div class="section-title"><mat-icon>schedule</mat-icon> Horários</div>
          <div class="row">
            <div><strong>Chegada:</strong> {{ data.parada.horaChegada || '-' }}</div>
            <div><strong>Saída:</strong> {{ data.parada.horaSaida || '-' }}</div>
          </div>
          <div class="row" *ngIf="data.parada.duracao">
            <div><strong>Duração:</strong> {{ data.parada.duracao }} min</div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.parada.endereco">
          <div class="section-title"><mat-icon>place</mat-icon> Local</div>
          <div>{{ data.parada.endereco }}</div>
        </div>

        <div class="grid-item" *ngIf="data.parada.custo">
          <div class="section-title"><mat-icon>attach_money</mat-icon> Custo</div>
          <div>{{ data.parada.custo | currency:'BRL':'symbol':'1.2-2':'pt' }}</div>
        </div>

        <div class="grid-item" *ngIf="data.parada.avaliacao">
          <div class="section-title"><mat-icon>star_rate</mat-icon> Avaliação</div>
          <div>
            <mat-chip color="accent">{{ data.parada.avaliacao }} / 5</mat-chip>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.parada.observacoes">
          <div class="section-title"><mat-icon>notes</mat-icon> Observações</div>
          <div class="obs">{{ data.parada.observacoes }}</div>
        </div>

        <div class="grid-item fotos-section" *ngIf="data.parada.fotos?.length">
          <div class="section-title"><mat-icon>photo_camera</mat-icon> Fotos ({{ data.parada.fotos?.length }})</div>
          <div class="fotos-galeria">
            <div *ngFor="let f of data.parada.fotos; let i = index" class="foto-wrapper" (click)="visualizarFoto(i)">
              <img [src]="f" [alt]="'Foto ' + (i + 1)" />
              <div class="foto-overlay">
                <mat-icon>zoom_in</mat-icon>
              </div>
            </div>
          </div>
        </div>
        
            </div>
          </div>
        </mat-tab>

        <!-- Aba do Mapa -->
        <mat-tab label="Mapa" *ngIf="data.parada.coordenadas">
          <div class="tab-content">
            <div class="map-container" #mapContainer></div>
            <div class="coordenadas-info" *ngIf="data.parada.coordenadas">
              <mat-icon>my_location</mat-icon>
              <span>{{ data.parada.coordenadas[0].toFixed(6) }}, {{ data.parada.coordenadas[1].toFixed(6) }}</span>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Modal de visualização de foto em tela cheia -->
      <div class="foto-modal" *ngIf="fotoSelecionada !== null" (click)="fecharFoto()">
        <div class="modal-content">
          <button mat-icon-button class="btn-fechar" (click)="fecharFoto()">
            <mat-icon>close</mat-icon>
          </button>
          <button mat-icon-button class="btn-anterior" (click)="fotoAnterior(); $event.stopPropagation()" *ngIf="data.parada.fotos && data.parada.fotos.length > 1">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <img [src]="data.parada.fotos![fotoSelecionada]" [alt]="'Foto ' + (fotoSelecionada + 1)" (click)="$event.stopPropagation()" />
          <button mat-icon-button class="btn-proximo" (click)="fotoProxima(); $event.stopPropagation()" *ngIf="data.parada.fotos && data.parada.fotos.length > 1">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <div class="foto-contador">{{ fotoSelecionada + 1 }} / {{ data.parada.fotos?.length }}</div>
        </div>
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">
        <mat-icon>close</mat-icon>
        Fechar
      </button>
    </div>
  `,
  styles: [
    `
    .title { display: flex; align-items: center; gap: 8px; }
    .tipo-icon { vertical-align: middle; }
    .content { max-height: 80vh; overflow: auto; }
    .subinfo { color: #666; margin: 4px 0 12px; display: flex; align-items: center; gap: 6px; }
    .sep { opacity: .6; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .grid-item { background: #fafafa; border-radius: 6px; padding: 12px; }
    .section-title { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 6px; }
    .row { display: flex; gap: 16px; }
    .obs { white-space: pre-wrap; }
    .fotos-section { grid-column: 1 / -1; }
    .fotos-galeria { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 8px; }
    .foto-wrapper { position: relative; cursor: pointer; overflow: hidden; border-radius: 8px; aspect-ratio: 4/3; }
    .foto-wrapper img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
    .foto-wrapper:hover img { transform: scale(1.05); }
    .foto-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; }
    .foto-wrapper:hover .foto-overlay { opacity: 1; }
    .foto-overlay mat-icon { color: white; font-size: 48px; width: 48px; height: 48px; }
    .foto-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; }
    .modal-content { position: relative; max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center; }
    .modal-content img { max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; }
    .btn-fechar { position: absolute; top: -50px; right: 0; color: white; }
    .btn-anterior, .btn-proximo { position: absolute; color: white; background: rgba(0,0,0,0.5); }
    .btn-anterior { left: -60px; }
    .btn-proximo { right: -60px; }
    .foto-contador { position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%); color: white; font-size: 14px; }
    .tabs-container { margin-top: 16px; }
    .tab-content { padding: 16px 0; }
    .map-container { width: 100%; height: 400px; background-color: #f5f5f5; border-radius: 8px; overflow: hidden; }
    .coordenadas-info { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; font-size: 14px; color: #666; }
    .coordenadas-info mat-icon { font-size: 20px; width: 20px; height: 20px; }
    @media (max-width: 768px) {
      .fotos-galeria { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .btn-anterior { left: 10px; }
      .btn-proximo { right: 10px; }
      .map-container { height: 300px; }
    }
    @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    `
  ]
})
export class ParadaDetailDialogComponent implements AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  fotoSelecionada: number | null = null;
  map: any;
  mapInitialized = false;
  
  private googleMapsLoader = inject(GoogleMapsLoaderService);

  constructor(
    private dialogRef: MatDialogRef<ParadaDetailDialogComponent, void>,
    @Inject(MAT_DIALOG_DATA) public data: ParadaDetailDialogData
  ) {}

  ngAfterViewInit(): void {
    // O mapa será inicializado quando a aba for selecionada
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getIconeParada(tipo: string): string {
    const icones: { [key: string]: string } = {
      'abastecimento': 'local_gas_station',
      'refeicao': 'restaurant',
      'ponto-interesse': 'place',
      'descanso': 'hotel',
      'manutencao': 'build',
      'hospedagem': 'hotel'
    };
    return icones[tipo] || 'place';
  }

  getTipoParadaTexto(tipo: string): string {
    const textos: { [key: string]: string } = {
      'abastecimento': 'Abastecimento',
      'refeicao': 'Refeição',
      'ponto-interesse': 'Ponto de Interesse',
      'descanso': 'Descanso',
      'manutencao': 'Manutenção',
      'hospedagem': 'Hospedagem'
    };
    return textos[tipo] || tipo;
  }

  visualizarFoto(index: number): void {
    this.fotoSelecionada = index;
  }

  fecharFoto(): void {
    this.fotoSelecionada = null;
  }

  fotoAnterior(): void {
    if (this.fotoSelecionada !== null && this.data.parada.fotos) {
      this.fotoSelecionada = this.fotoSelecionada > 0 
        ? this.fotoSelecionada - 1 
        : this.data.parada.fotos.length - 1;
    }
  }

  fotoProxima(): void {
    if (this.fotoSelecionada !== null && this.data.parada.fotos) {
      this.fotoSelecionada = this.fotoSelecionada < this.data.parada.fotos.length - 1 
        ? this.fotoSelecionada + 1 
        : 0;
    }
  }

  /**
   * Detecta mudança de aba
   */
  onTabChange(event: any): void {
    // Índice 1 é a aba do mapa (0 = Informações, 1 = Mapa)
    if (event.index === 1 && !this.mapInitialized) {
      setTimeout(() => {
        this.initializeMap();
      }, 100);
    }
  }

  /**
   * Inicializa o mapa do Google
   */
  private async initializeMap(): Promise<void> {
    if (this.mapInitialized || !this.data.parada.coordenadas) return;

    try {
      // Carregar Google Maps se necessário
      await this.googleMapsLoader.load();

      if (!this.mapContainer || !this.mapContainer.nativeElement) {
        console.warn('mapContainer não disponível');
        return;
      }

      const coords = this.data.parada.coordenadas;
      const position = { lat: coords[0], lng: coords[1] };

      // Criar mapa
      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: position,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Adicionar marcador
      const marker = new google.maps.Marker({
        position,
        map: this.map,
        title: this.data.parada.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: this.getMarkerColor(this.data.parada.tipo),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });

      // Adicionar InfoWindow
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h4 style="margin: 0 0 8px 0;">${this.data.parada.nome}</h4>
            <p style="margin: 0; color: #666;">${this.getTipoParadaTexto(this.data.parada.tipo)}</p>
            ${this.data.parada.endereco ? `<p style="margin: 4px 0 0 0; font-size: 13px;">${this.data.parada.endereco}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });

      this.mapInitialized = true;
    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
    }
  }

  /**
   * Retorna a cor do marcador baseado no tipo
   */
  private getMarkerColor(tipo: string): string {
    const cores: { [key: string]: string } = {
      'abastecimento': '#ff5722',
      'refeicao': '#4caf50',
      'ponto-interesse': '#2196f3',
      'descanso': '#9c27b0',
      'manutencao': '#ff9800',
      'hospedagem': '#795548'
    };
    return cores[tipo] || '#2196f3';
  }
}

