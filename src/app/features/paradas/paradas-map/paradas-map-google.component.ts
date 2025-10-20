import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    AfterViewInit,
    ElementRef,
    ViewChild,
    ChangeDetectionStrategy,
    inject,
    OnChanges,
    SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Models e Services
import { Parada, TipoParada } from '../../../models';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';

/**
 * Interface para marcador no mapa
 */
interface ParadaMarker {
    parada: Parada;
    marker: any;
    infoWindow: any;
}

@Component({
    selector: 'app-paradas-map-google',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        MatSelectModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './paradas-map-google.component.html',
    styleUrls: ['./paradas-map-google.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParadasMapGoogleComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    @Input() paradas: Parada[] = [];
    @Input() center: [number, number] = [-15.7942, -47.8822]; // Brasília como padrão
    @Input() zoom: number = 6;
    @Input() height: string = '400px';
    @Input() showFilters: boolean = true;
    @Input() showLegend: boolean = true;

    @Output() paradaSelected = new EventEmitter<Parada>();
    @Output() mapReady = new EventEmitter<any>();

    private googleMapsLoader = inject(GoogleMapsLoaderService);

    // Estado do componente
    map: any;
    markers: ParadaMarker[] = [];
    isMapReady = false;
    isLoading = true;

    // Filtros
    filtroTipo: TipoParada | 'todos' = 'todos';
    TipoParada = TipoParada;

    // Configurações de ícones por tipo
    tipoIcons = {
        [TipoParada.ABASTECIMENTO]: {
            icon: 'local_gas_station',
            color: '#ff5722',
            label: 'Abastecimento',
            markerColor: '#ff5722'
        },
        [TipoParada.REFEICAO]: {
            icon: 'restaurant',
            color: '#4caf50',
            label: 'Refeição',
            markerColor: '#4caf50'
        },
        [TipoParada.PONTO_INTERESSE]: {
            icon: 'place',
            color: '#2196f3',
            label: 'Ponto de Interesse',
            markerColor: '#2196f3'
        },
        [TipoParada.DESCANSO]: {
            icon: 'hotel',
            color: '#9c27b0',
            label: 'Descanso',
            markerColor: '#9c27b0'
        },
        [TipoParada.MANUTENCAO]: {
            icon: 'build',
            color: '#ff9800',
            label: 'Manutenção',
            markerColor: '#ff9800'
        },
        [TipoParada.HOSPEDAGEM]: {
            icon: 'bed',
            color: '#795548',
            label: 'Hospedagem',
            markerColor: '#795548'
        }
    };

    ngOnInit(): void {
        this.loadGoogleMaps();
    }

    ngAfterViewInit(): void {
        // O mapa será inicializado após o Google Maps carregar
    }

    ngOnDestroy(): void {
        this.clearMarkers();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['paradas'] && this.isMapReady) {
            this.updateMarkers();
        }
    }

    /**
     * Carrega o Google Maps
     */
    private async loadGoogleMaps(): Promise<void> {
        try {
            await this.googleMapsLoader.load();
            this.isLoading = false;
            
            // Aguardar um pouco para garantir que o container está renderizado
            setTimeout(() => {
                if (this.mapContainer) {
                    this.initializeMap();
                }
            }, 100);
        } catch (error) {
            console.error('Erro ao carregar Google Maps:', error);
            this.isLoading = false;
        }
    }

    /**
     * Inicializa o mapa do Google
     */
    private initializeMap(): void {
        if (!this.mapContainer || this.isMapReady) return;

        try {
            this.map = new google.maps.Map(this.mapContainer.nativeElement, {
                center: { lat: this.center[0], lng: this.center[1] },
                zoom: this.zoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });

            this.isMapReady = true;
            this.mapReady.emit(this.map);

            // Adicionar marcadores se já existem paradas
            if (this.paradas.length > 0) {
                this.updateMarkers();
            }
        } catch (error) {
            console.error('Erro ao inicializar mapa:', error);
        }
    }

    /**
     * Atualiza marcadores no mapa
     */
    private updateMarkers(): void {
        if (!this.isMapReady) return;

        // Limpar marcadores existentes
        this.clearMarkers();

        // Filtrar paradas
        const paradasFiltradas = this.filtroTipo === 'todos'
            ? this.paradas
            : this.paradas.filter(p => p.tipo === this.filtroTipo);

        // Adicionar novos marcadores
        paradasFiltradas.forEach(parada => {
            if (parada.coordenadas && parada.coordenadas.length === 2) {
                this.addMarker(parada);
            }
        });

        // Ajustar visualização se há marcadores
        if (this.markers.length > 0) {
            this.fitMapToMarkers();
        }
    }

    /**
     * Adiciona marcador para uma parada
     */
    private addMarker(parada: Parada): void {
        if (!this.isMapReady || !parada.coordenadas) return;

        const tipoConfig = this.tipoIcons[parada.tipo];
        const position = { lat: parada.coordenadas[0], lng: parada.coordenadas[1] };

        // Criar marcador customizado
        const marker = new google.maps.Marker({
            position,
            map: this.map,
            title: parada.nome,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: tipoConfig.markerColor,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            },
            animation: google.maps.Animation.DROP
        });

        // Criar InfoWindow
        const infoWindow = new google.maps.InfoWindow({
            content: this.createInfoWindowContent(parada)
        });

        // Eventos do marcador
        marker.addListener('click', () => {
            // Fechar outras InfoWindows
            this.markers.forEach(m => m.infoWindow.close());
            
            // Abrir esta InfoWindow
            infoWindow.open(this.map, marker);
            
            // Emitir evento de seleção
            this.paradaSelected.emit(parada);
        });

        // Armazenar referência
        this.markers.push({
            parada,
            marker,
            infoWindow
        });
    }

    /**
     * Cria conteúdo da InfoWindow
     */
    private createInfoWindowContent(parada: Parada): string {
        const tipoConfig = this.tipoIcons[parada.tipo];

        let content = `
            <div style="padding: 12px; max-width: 300px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="color: ${tipoConfig.color}; font-size: 24px;" class="material-icons">${tipoConfig.icon}</span>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${parada.nome}</h3>
                </div>
                <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Tipo:</strong> ${tipoConfig.label}</p>
        `;

        if (parada.endereco) {
            content += `<p style="margin: 4px 0; font-size: 14px;"><strong>Endereço:</strong> ${parada.endereco}</p>`;
        }

        if (parada.horaChegada) {
            content += `<p style="margin: 4px 0; font-size: 14px;"><strong>Chegada:</strong> ${parada.horaChegada}</p>`;
        }

        if (parada.horaSaida) {
            content += `<p style="margin: 4px 0; font-size: 14px;"><strong>Saída:</strong> ${parada.horaSaida}</p>`;
        }

        if (parada.custo) {
            content += `<p style="margin: 4px 0; font-size: 14px;"><strong>Custo:</strong> R$ ${parada.custo.toFixed(2)}</p>`;
        }

        if (parada.observacoes) {
            const obsResumida = parada.observacoes.length > 100 
                ? parada.observacoes.substring(0, 100) + '...' 
                : parada.observacoes;
            content += `<p style="margin: 4px 0; font-size: 13px; color: #555;">${obsResumida}</p>`;
        }

        content += `</div>`;

        return content;
    }

    /**
     * Limpa todos os marcadores
     */
    private clearMarkers(): void {
        this.markers.forEach(({ marker, infoWindow }) => {
            infoWindow.close();
            marker.setMap(null);
        });
        this.markers = [];
    }

    /**
     * Ajusta o mapa para mostrar todos os marcadores
     */
    private fitMapToMarkers(): void {
        if (this.markers.length === 0) return;

        if (this.markers.length === 1) {
            // Se há apenas um marcador, centralizar nele
            const parada = this.markers[0].parada;
            if (parada.coordenadas) {
                this.map.setCenter({ lat: parada.coordenadas[0], lng: parada.coordenadas[1] });
                this.map.setZoom(15);
            }
        } else {
            // Se há múltiplos marcadores, ajustar para mostrar todos
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(({ parada }) => {
                if (parada.coordenadas) {
                    bounds.extend({ lat: parada.coordenadas[0], lng: parada.coordenadas[1] });
                }
            });
            this.map.fitBounds(bounds);
        }
    }

    /**
     * Aplica filtro por tipo
     */
    onFiltroTipoChange(): void {
        this.updateMarkers();
    }

    /**
     * Centraliza mapa em uma parada específica
     */
    centerOnParada(parada: Parada): void {
        if (!parada.coordenadas || !this.isMapReady) return;

        this.map.setCenter({ lat: parada.coordenadas[0], lng: parada.coordenadas[1] });
        this.map.setZoom(16);

        // Encontrar e abrir InfoWindow do marcador
        const markerData = this.markers.find(m => m.parada.id === parada.id);
        if (markerData) {
            // Fechar outras InfoWindows
            this.markers.forEach(m => m.infoWindow.close());
            
            // Abrir esta InfoWindow
            markerData.infoWindow.open(this.map, markerData.marker);
        }
    }

    /**
     * Obtém lista de tipos únicos das paradas
     */
    getTiposDisponiveis(): TipoParada[] {
        const tipos = new Set(this.paradas.map(p => p.tipo));
        return Array.from(tipos);
    }

    /**
     * Obtém configuração do ícone por tipo
     */
    getTipoConfig(tipo: TipoParada) {
        return this.tipoIcons[tipo];
    }

    /**
     * Obtém contagem de paradas por tipo
     */
    getContagemPorTipo(tipo: TipoParada): number {
        return this.paradas.filter(p => p.tipo === tipo).length;
    }
}
