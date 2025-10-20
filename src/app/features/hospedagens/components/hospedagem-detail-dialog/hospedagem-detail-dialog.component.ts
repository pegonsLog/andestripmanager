import { Component, Inject, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { Hospedagem } from '../../../../models';
import { GoogleMapsLoaderService } from '../../../../services/google-maps-loader.service';

export interface HospedagemDetailDialogData {
  hospedagem: Hospedagem;
  diaLabel: string;
}

@Component({
  selector: 'app-hospedagem-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule, MatTabsModule],
  template: `
    <h5 mat-dialog-title class="title">
      <mat-icon class="tipo-icon">{{ getIconeHospedagem(data.hospedagem.tipo) }}</mat-icon>
      {{ data.hospedagem.nome }}
    </h5>

    <div mat-dialog-content class="content">
      <div class="subinfo">
        <span class="dia">{{ data.diaLabel }}</span>
        <span class="sep">•</span>
        <span class="tipo">{{ getTipoHospedagemTexto(data.hospedagem.tipo) }}</span>
      </div>

      <mat-tab-group class="tabs-container" (selectedTabChange)="onTabChange($event)">
        <!-- Aba de Informações -->
        <mat-tab label="Informações">
          <div class="tab-content">
            <div class="grid">
        <div class="grid-item">
          <div class="section-title"><mat-icon>event</mat-icon> Período</div>
          <div class="row">
            <div><strong>Check-in:</strong> {{ data.hospedagem.dataCheckIn | date:'dd/MM/yyyy' }} <span *ngIf="data.hospedagem.horaCheckIn">às {{ data.hospedagem.horaCheckIn }}</span></div>
          </div>
          <div class="row">
            <div><strong>Check-out:</strong> {{ data.hospedagem.dataCheckOut | date:'dd/MM/yyyy' }} <span *ngIf="data.hospedagem.horaCheckOut">às {{ data.hospedagem.horaCheckOut }}</span></div>
          </div>
          <div class="row" *ngIf="data.hospedagem.numeroNoites">
            <div><strong>Número de noites:</strong> {{ data.hospedagem.numeroNoites }}</div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.valorDiaria">
          <div class="section-title"><mat-icon>attach_money</mat-icon> Valores</div>
          <div class="row">
            <div><strong>Diária:</strong> {{ data.hospedagem.valorDiaria | currency:'BRL':'symbol':'1.2-2':'pt' }}</div>
          </div>
          <div class="row" *ngIf="data.hospedagem.valorTotal">
            <div><strong>Total:</strong> {{ data.hospedagem.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt' }}</div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.endereco">
          <div class="section-title"><mat-icon>place</mat-icon> Endereço</div>
          <div>{{ data.hospedagem.endereco }}</div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.comodidades?.length">
          <div class="section-title"><mat-icon>checklist</mat-icon> Comodidades</div>
          <div class="chips">
            <mat-chip *ngFor="let c of data.hospedagem.comodidades">{{ c }}</mat-chip>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.avaliacao">
          <div class="section-title"><mat-icon>star_rate</mat-icon> Avaliação</div>
          <mat-chip color="accent">{{ data.hospedagem.avaliacao }} / 5</mat-chip>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.telefone || data.hospedagem.email || data.hospedagem.siteOficial">
          <div class="section-title"><mat-icon>contact_phone</mat-icon> Contato</div>
          <div class="row" *ngIf="data.hospedagem.telefone">
            <div><strong>Telefone:</strong> <a [href]="'tel:' + data.hospedagem.telefone">{{ data.hospedagem.telefone }}</a></div>
          </div>
          <div class="row" *ngIf="data.hospedagem.email">
            <div><strong>Email:</strong> <a [href]="'mailto:' + data.hospedagem.email">{{ data.hospedagem.email }}</a></div>
          </div>
          <div class="row" *ngIf="data.hospedagem.siteOficial">
            <div><strong>Site:</strong> <a [href]="data.hospedagem.siteOficial" target="_blank" rel="noopener">{{ data.hospedagem.siteOficial }}</a></div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.linkReserva || data.hospedagem.estacionamentoCoberto">
          <div class="section-title"><mat-icon>info</mat-icon> Informações Adicionais</div>
          <div class="row" *ngIf="data.hospedagem.linkReserva">
            <div><strong>Link da Reserva:</strong> <a [href]="data.hospedagem.linkReserva" target="_blank" rel="noopener">Acessar reserva</a></div>
          </div>
          <div class="row" *ngIf="data.hospedagem.estacionamentoCoberto">
            <div class="estacionamento-badge">
              <mat-icon>motorcycle</mat-icon>
              <span>Estacionamento coberto para motocicleta</span>
            </div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.avaliacaoDetalhada">
          <div class="section-title"><mat-icon>analytics</mat-icon> Avaliação Detalhada</div>
          <div class="avaliacoes-detalhadas">
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.qualidadeQuarto">
              <span>Qualidade do Quarto:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.qualidadeQuarto }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.qualidadeAtendimento">
              <span>Atendimento:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.qualidadeAtendimento }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.limpeza">
              <span>Limpeza:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.limpeza }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.localizacao">
              <span>Localização:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.localizacao }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.custoBeneficio">
              <span>Custo-Benefício:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.custoBeneficio }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.seguranca">
              <span>Segurança:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.seguranca }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.cafeManha">
              <span>Café da Manhã:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.cafeManha }}/5 ⭐</span>
            </div>
            <div class="avaliacao-item" *ngIf="data.hospedagem.avaliacaoDetalhada.wifi">
              <span>Wi-Fi:</span>
              <span class="rating">{{ data.hospedagem.avaliacaoDetalhada.wifi }}/5 ⭐</span>
            </div>
            <div class="avaliacao-comentarios" *ngIf="data.hospedagem.avaliacaoDetalhada.comentarios">
              <strong>Comentários:</strong>
              <p>{{ data.hospedagem.avaliacaoDetalhada.comentarios }}</p>
            </div>
          </div>
        </div>

        <div class="grid-item" *ngIf="data.hospedagem.observacoes">
          <div class="section-title"><mat-icon>notes</mat-icon> Observações</div>
          <div class="obs">{{ data.hospedagem.observacoes }}</div>
        </div>

        <div class="grid-item fotos-section" *ngIf="data.hospedagem.fotos?.length">
          <div class="section-title"><mat-icon>photo_camera</mat-icon> Fotos ({{ data.hospedagem.fotos?.length }})</div>
          <div class="fotos-galeria">
            <div *ngFor="let f of data.hospedagem.fotos; let i = index" 
                 class="foto-wrapper" 
                 role="button"
                 tabindex="0"
                 (click)="visualizarFoto(i)"
                 (keyup.enter)="visualizarFoto(i)"
                 (keyup.space)="visualizarFoto(i)">
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
        <mat-tab label="Mapa" *ngIf="data.hospedagem.coordenadas">
          <div class="tab-content">
            <div class="map-container" #mapContainer></div>
            <div class="coordenadas-info" *ngIf="data.hospedagem.coordenadas">
              <mat-icon>my_location</mat-icon>
              <span>{{ data.hospedagem.coordenadas[0].toFixed(6) }}, {{ data.hospedagem.coordenadas[1].toFixed(6) }}</span>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Modal de visualização de foto em tela cheia -->
      <div class="foto-modal" 
           *ngIf="fotoSelecionada !== null" 
           (click)="fecharFoto()" 
           (keydown)="onModalKeydown($event)"
           tabindex="0"
           role="dialog"
           aria-modal="true"
           aria-label="Visualização de foto em tela cheia">
        <div class="modal-content">
          <button mat-icon-button class="btn-fechar" (click)="fecharFoto()" aria-label="Fechar visualização">
            <mat-icon>close</mat-icon>
          </button>
          <button mat-icon-button class="btn-anterior" (click)="fotoAnterior(); $event.stopPropagation()" *ngIf="data.hospedagem.fotos && data.hospedagem.fotos.length > 1" aria-label="Foto anterior">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <img [src]="data.hospedagem.fotos![fotoSelecionada]" [alt]="'Foto ' + (fotoSelecionada + 1) + ' de ' + data.hospedagem.fotos?.length" class="modal-image" />
          <button mat-icon-button class="btn-proximo" (click)="fotoProxima(); $event.stopPropagation()" *ngIf="data.hospedagem.fotos && data.hospedagem.fotos.length > 1" aria-label="Próxima foto">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <div class="foto-contador" aria-live="polite">{{ fotoSelecionada + 1 }} / {{ data.hospedagem.fotos?.length }}</div>
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
    .modal-image { pointer-events: none; }
    .btn-fechar { position: absolute; top: -50px; right: 0; color: white; }
    .btn-anterior, .btn-proximo { position: absolute; color: white; background: rgba(0,0,0,0.5); }
    .btn-anterior { left: -60px; }
    .btn-proximo { right: -60px; }
    .foto-contador { position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%); color: white; font-size: 14px; }
    @media (max-width: 768px) {
      .fotos-galeria { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .btn-anterior { left: 10px; }
      .btn-proximo { right: 10px; }
    }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .tabs-container { margin-top: 16px; }
    .tab-content { padding: 16px 0; }
    .map-container { width: 100%; height: 400px; background-color: #f5f5f5; border-radius: 8px; overflow: hidden; }
    .coordenadas-info { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 12px; background-color: #f5f5f5; border-radius: 6px; font-size: 14px; color: #666; }
    .coordenadas-info mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .estacionamento-badge { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background-color: #e3f2fd; color: #1976d2; border-radius: 6px; font-weight: 500; }
    .estacionamento-badge mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .avaliacoes-detalhadas { display: flex; flex-direction: column; gap: 8px; }
    .avaliacao-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e0e0e0; }
    .avaliacao-item:last-of-type { border-bottom: none; }
    .avaliacao-item span:first-child { color: #666; font-size: 14px; }
    .avaliacao-item .rating { font-weight: 600; color: #ff9800; }
    .avaliacao-comentarios { margin-top: 12px; padding-top: 12px; border-top: 2px solid #e0e0e0; }
    .avaliacao-comentarios p { margin: 8px 0 0; color: #666; white-space: pre-wrap; line-height: 1.5; }
    @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 768px) { .map-container { height: 300px; } }
    `
  ]
})
export class HospedagemDetailDialogComponent {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  fotoSelecionada: number | null = null;
  map: google.maps.Map | null = null;
  mapInitialized = false;
  
  private googleMapsLoader = inject(GoogleMapsLoaderService);

  constructor(
    private dialogRef: MatDialogRef<HospedagemDetailDialogComponent, void>,
    @Inject(MAT_DIALOG_DATA) public data: HospedagemDetailDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  getIconeHospedagem(tipo: string): string {
    const icons: { [key: string]: string } = {
      'hotel': 'hotel',
      'pousada': 'house',
      'hostel': 'group',
      'camping': 'nature',
      'casa-temporada': 'home',
      'apartamento': 'apartment',
      'outros': 'business'
    };
    return icons[tipo] || 'hotel';
  }

  getTipoHospedagemTexto(tipo: string): string {
    const labels: { [key: string]: string } = {
      'hotel': 'Hotel',
      'pousada': 'Pousada',
      'hostel': 'Hostel',
      'camping': 'Camping',
      'casa-temporada': 'Casa de Temporada',
      'apartamento': 'Apartamento',
      'outros': 'Outros'
    };
    return labels[tipo] || tipo;
  }

  visualizarFoto(index: number): void {
    this.fotoSelecionada = index;
  }

  fecharFoto(): void {
    this.fotoSelecionada = null;
  }

  fotoAnterior(): void {
    if (this.fotoSelecionada !== null && this.data.hospedagem.fotos) {
      this.fotoSelecionada = this.fotoSelecionada > 0 
        ? this.fotoSelecionada - 1 
        : this.data.hospedagem.fotos.length - 1;
    }
  }

  fotoProxima(): void {
    if (this.fotoSelecionada !== null && this.data.hospedagem.fotos) {
      this.fotoSelecionada = this.fotoSelecionada < this.data.hospedagem.fotos.length - 1 
        ? this.fotoSelecionada + 1 
        : 0;
    }
  }

  /**
   * Manipula eventos de teclado no modal de fotos para acessibilidade
   */
  onModalKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.fecharFoto();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.fotoAnterior();
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.fotoProxima();
        event.preventDefault();
        break;
    }
  }

  /**
   * Detecta mudança de aba
   */
  onTabChange(event: MatTabChangeEvent): void {
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
    if (this.mapInitialized || !this.data.hospedagem.coordenadas) return;

    try {
      // Carregar Google Maps se necessário
      await this.googleMapsLoader.load();

      if (!this.mapContainer || !this.mapContainer.nativeElement) {
        console.warn('mapContainer não disponível');
        return;
      }

      const coords = this.data.hospedagem.coordenadas;
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
        title: this.data.hospedagem.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: this.getMarkerColor(this.data.hospedagem.tipo),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        }
      });

      // Adicionar InfoWindow
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h4 style="margin: 0 0 8px 0;">${this.data.hospedagem.nome}</h4>
            <p style="margin: 0; color: #666;">${this.getTipoHospedagemTexto(this.data.hospedagem.tipo)}</p>
            ${this.data.hospedagem.endereco ? `<p style="margin: 4px 0 0 0; font-size: 13px;">${this.data.hospedagem.endereco}</p>` : ''}
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
      'hotel': '#1976d2',
      'pousada': '#4caf50',
      'hostel': '#ff9800',
      'camping': '#8bc34a',
      'casa-temporada': '#9c27b0',
      'apartamento': '#00bcd4',
      'outros': '#795548'
    };
    return cores[tipo] || '#1976d2';
  }
}
