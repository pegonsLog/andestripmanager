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
    OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheetModule, MatBottomSheet } from '@angular/material/bottom-sheet';

// Models
import { Parada, TipoParada } from '../../../models';

// Leaflet (será carregado dinamicamente)
declare let L: any;

/**
 * Interface para marcador no mapa
 */
interface ParadaMarker {
    parada: Parada;
    marker: any;
    popup: any;
}

@Component({
    selector: 'app-paradas-map',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        MatSelectModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatBottomSheetModule
    ],
    templateUrl: './paradas-map.component.html',
    styleUrls: ['./paradas-map.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParadasMapComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

    @Input() paradas: Parada[] = [];
    @Input() center: [number, number] = [-15.7942, -47.8822]; // Brasília como padrão
    @Input() zoom: number = 6;
    @Input() height: string = '400px';
    @Input() showFilters: boolean = true;
    @Input() showLegend: boolean = true;
    @Input() clustered: boolean = true;

    @Output() paradaSelected = new EventEmitter<Parada>();
    @Output() mapReady = new EventEmitter<any>();

    private bottomSheet = inject(MatBottomSheet);

    // Estado do componente
    map: any;
    markers: ParadaMarker[] = [];
    markerClusterGroup: any;
    isMapReady = false;
    leafletLoaded = false;

    // Camadas adicionais
    poiLayers: { [key: string]: any } = {};
    poiMarkers: any[] = [];
    showPOI = {
        restaurants: false,
        hotels: false,
        gasStations: false,
        attractions: false
    };

    // Filtros
    filtroTipo: TipoParada | 'todos' = 'todos';
    TipoParada = TipoParada;

    // Configurações de ícones por tipo
    tipoIcons = {
        [TipoParada.ABASTECIMENTO]: {
            icon: 'local_gas_station',
            color: '#ff5722',
            label: 'Abastecimento'
        },
        [TipoParada.REFEICAO]: {
            icon: 'restaurant',
            color: '#4caf50',
            label: 'Refeição'
        },
        [TipoParada.PONTO_INTERESSE]: {
            icon: 'place',
            color: '#2196f3',
            label: 'Ponto de Interesse'
        },
        [TipoParada.DESCANSO]: {
            icon: 'hotel',
            color: '#9c27b0',
            label: 'Descanso'
        },
        [TipoParada.MANUTENCAO]: {
            icon: 'build',
            color: '#ff9800',
            label: 'Manutenção'
        },
        [TipoParada.HOSPEDAGEM]: {
            icon: 'bed',
            color: '#795548',
            label: 'Hospedagem'
        }
    };

    ngOnInit(): void {
        this.loadLeaflet();
    }

    ngAfterViewInit(): void {
        if (this.leafletLoaded) {
            this.initializeMap();
        }
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    /**
     * Carrega a biblioteca Leaflet dinamicamente
     */
    private async loadLeaflet(): Promise<void> {
        if (typeof L !== 'undefined') {
            this.leafletLoaded = true;
            if (this.mapContainer) {
                this.initializeMap();
            }
            return;
        }

        try {
            // Carregar CSS do Leaflet
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(cssLink);

            // Carregar JavaScript do Leaflet
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                this.leafletLoaded = true;
                if (this.mapContainer) {
                    this.initializeMap();
                }
            };
            document.head.appendChild(script);

            // Carregar plugin de cluster se necessário
            if (this.clustered) {
                const clusterCss = document.createElement('link');
                clusterCss.rel = 'stylesheet';
                clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
                document.head.appendChild(clusterCss);

                const clusterScript = document.createElement('script');
                clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
                document.head.appendChild(clusterScript);
            }
        } catch (error) {
            console.error('Erro ao carregar Leaflet:', error);
        }
    }

    /**
     * Inicializa o mapa
     */
    private initializeMap(): void {
        if (!this.leafletLoaded || this.isMapReady) return;

        try {
            // Criar mapa
            this.map = L.map(this.mapContainer.nativeElement, {
                center: this.center,
                zoom: this.zoom,
                zoomControl: true,
                attributionControl: true
            });

            // Adicionar camada de tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Inicializar cluster se habilitado
            if (this.clustered && typeof L.markerClusterGroup !== 'undefined') {
                this.markerClusterGroup = L.markerClusterGroup({
                    chunkedLoading: true,
                    maxClusterRadius: 50
                });
                this.map.addLayer(this.markerClusterGroup);
            }

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

        // Criar ícone customizado
        const icon = L.divIcon({
            html: `
                <div class="custom-marker" style="background-color: ${tipoConfig.color}">
                    <i class="material-icons">${tipoConfig.icon}</i>
                </div>
            `,
            className: 'custom-marker-container',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        // Criar marcador
        const marker = L.marker([parada.coordenadas[0], parada.coordenadas[1]], { icon });

        // Criar popup
        const popupContent = this.createPopupContent(parada);
        const popup = L.popup({
            maxWidth: 300,
            className: 'parada-popup'
        }).setContent(popupContent);

        marker.bindPopup(popup);

        // Eventos do marcador
        marker.on('click', () => {
            this.onMarkerClick(parada);
        });

        // Adicionar ao mapa ou cluster
        if (this.clustered && this.markerClusterGroup) {
            this.markerClusterGroup.addLayer(marker);
        } else {
            marker.addTo(this.map);
        }

        // Armazenar referência
        this.markers.push({
            parada,
            marker,
            popup
        });
    }

    /**
     * Cria conteúdo do popup
     */
    private createPopupContent(parada: Parada): string {
        const tipoConfig = this.tipoIcons[parada.tipo];

        let content = `
            <div class="popup-content">
                <div class="popup-header">
                    <i class="material-icons" style="color: ${tipoConfig.color}">${tipoConfig.icon}</i>
                    <h4>${parada.nome}</h4>
                </div>
                <div class="popup-body">
                    <p style="display: flex; align-items: center; gap: 6px;">
                        <i class="material-icons" style="font-size: 16px; color: ${tipoConfig.color};">label</i>
                        <strong>Tipo:</strong> ${tipoConfig.label}
                    </p>
        `;

        if (parada.endereco) {
            content += `
                    <p style="display: flex; align-items: start; gap: 6px;">
                        <i class="material-icons" style="font-size: 16px; color: #666;">place</i>
                        <span><strong>Endereço:</strong> ${parada.endereco}</span>
                    </p>`;
        }

        if (parada.horaChegada || parada.horaSaida) {
            const horario = parada.horaChegada && parada.horaSaida 
                ? `${parada.horaChegada} - ${parada.horaSaida}`
                : parada.horaChegada || parada.horaSaida || '';
            content += `
                    <p style="display: flex; align-items: center; gap: 6px;">
                        <i class="material-icons" style="font-size: 16px; color: #666;">schedule</i>
                        <span><strong>Horário:</strong> ${horario}</span>
                    </p>`;
        }

        if (parada.custo && parada.custo > 0) {
            content += `
                    <p style="display: flex; align-items: center; gap: 6px;">
                        <i class="material-icons" style="font-size: 16px; color: #4caf50;">attach_money</i>
                        <span><strong>Custo:</strong> <span style="color: #4caf50; font-weight: 600;">R$ ${parada.custo.toFixed(2)}</span></span>
                    </p>`;
        }

        if (parada.duracao && parada.duracao > 0) {
            const horas = Math.floor(parada.duracao / 60);
            const minutos = parada.duracao % 60;
            const duracaoTexto = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;
            content += `
                    <p style="display: flex; align-items: center; gap: 6px;">
                        <i class="material-icons" style="font-size: 16px; color: #666;">timer</i>
                        <span><strong>Duração:</strong> ${duracaoTexto}</span>
                    </p>`;
        }

        if (parada.avaliacao && parada.avaliacao > 0) {
            const estrelas = '⭐'.repeat(parada.avaliacao);
            content += `
                    <p style="display: flex; align-items: center; gap: 6px;">
                        <i class="material-icons" style="font-size: 16px; color: #ffc107;">star</i>
                        <span><strong>Avaliação:</strong> ${estrelas} (${parada.avaliacao}/5)</span>
                    </p>`;
        }

        if (parada.observacoes) {
            content += `
                    <p style="display: flex; align-items: start; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                        <i class="material-icons" style="font-size: 16px; color: #ff9800;">info</i>
                        <span style="font-style: italic; color: #666;">${parada.observacoes}</span>
                    </p>`;
        }

        content += `
                </div>
                <div class="popup-actions">
                    <button onclick="window.paradaMapComponent.openParadaDetails('${parada.id}')" 
                            class="popup-button">
                        <i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">visibility</i>
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `;

        return content;
    }

    /**
     * Manipula clique no marcador
     */
    private onMarkerClick(parada: Parada): void {
        this.paradaSelected.emit(parada);
    }

    /**
     * Limpa todos os marcadores
     */
    private clearMarkers(): void {
        this.markers.forEach(({ marker }) => {
            if (this.clustered && this.markerClusterGroup) {
                this.markerClusterGroup.removeLayer(marker);
            } else {
                this.map.removeLayer(marker);
            }
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
                this.map.setView([parada.coordenadas[0], parada.coordenadas[1]], 15);
            }
        } else {
            // Se há múltiplos marcadores, ajustar para mostrar todos
            const group = new L.featureGroup(this.markers.map(m => m.marker));
            this.map.fitBounds(group.getBounds().pad(0.1));
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

        this.map.setView([parada.coordenadas[0], parada.coordenadas[1]], 16);

        // Encontrar e abrir popup do marcador
        const markerData = this.markers.find(m => m.parada.id === parada.id);
        if (markerData) {
            markerData.marker.openPopup();
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

    /**
     * Atualiza paradas (chamado quando @Input muda)
     */
    ngOnChanges(): void {
        if (this.isMapReady) {
            this.updateMarkers();
        }
    }

    /**
     * Abre detalhes da parada (chamado do popup)
     */
    openParadaDetails(paradaId: string): void {
        const parada = this.paradas.find(p => p.id === paradaId);
        if (parada) {
            this.paradaSelected.emit(parada);
        }
    }

    /**
     * Alterna exibição de POI (Points of Interest)
     */
    togglePOI(type: 'restaurants' | 'hotels' | 'gasStations' | 'attractions'): void {
        this.showPOI[type] = !this.showPOI[type];
        
        if (this.showPOI[type]) {
            // Limpar outros POIs primeiro
            this.clearPOIMarkers();
            
            // Buscar POIs via Overpass API
            this.fetchPOIs(type);
        } else {
            this.clearPOIMarkers();
        }
    }

    /**
     * Busca POIs usando Overpass API
     */
    private async fetchPOIs(type: string): Promise<void> {
        if (!this.isMapReady) return;

        const bounds = this.map.getBounds();
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        // Mapear tipos para tags OSM
        const osmTags: { [key: string]: string } = {
            restaurants: 'amenity=restaurant',
            hotels: 'tourism=hotel',
            gasStations: 'amenity=fuel',
            attractions: 'tourism=attraction'
        };

        const tag = osmTags[type];
        if (!tag) return;

        // Query Overpass API
        const query = `
            [out:json][timeout:25];
            (
                node[${tag}](${south},${west},${north},${east});
                way[${tag}](${south},${west},${north},${east});
            );
            out center 50;
        `;

        const overpassUrl = 'https://overpass-api.de/api/interpreter';

        try {
            const response = await fetch(overpassUrl, {
                method: 'POST',
                body: query
            });

            const data = await response.json();
            
            if (data.elements && data.elements.length > 0) {
                this.addPOIMarkers(data.elements, type);
            }
        } catch (error) {
            console.error('Erro ao buscar POIs:', error);
        }
    }

    /**
     * Adiciona marcadores de POI ao mapa
     */
    private addPOIMarkers(elements: any[], type: string): void {
        const iconConfig: { [key: string]: { color: string; icon: string } } = {
            restaurants: { color: '#4caf50', icon: 'restaurant' },
            hotels: { color: '#9c27b0', icon: 'hotel' },
            gasStations: { color: '#ff5722', icon: 'local_gas_station' },
            attractions: { color: '#2196f3', icon: 'place' }
        };

        const config = iconConfig[type];

        elements.forEach((element: any) => {
            const lat = element.lat || element.center?.lat;
            const lon = element.lon || element.center?.lon;

            if (!lat || !lon) return;

            const name = element.tags?.name || 'Sem nome';
            const address = element.tags?.['addr:street'] || '';

            // Criar ícone customizado
            const icon = L.divIcon({
                html: `
                    <div class="poi-marker" style="background-color: ${config.color}">
                        <i class="material-icons">${config.icon}</i>
                    </div>
                `,
                className: 'poi-marker-container',
                iconSize: [28, 28],
                iconAnchor: [14, 28],
                popupAnchor: [0, -28]
            });

            // Criar marcador
            const marker = L.marker([lat, lon], { 
                icon,
                opacity: 0.8
            });

            // Criar popup
            const popupContent = `
                <div class="poi-popup-content">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="material-icons" style="color: ${config.color}; font-size: 20px;">${config.icon}</i>
                        <h4 style="margin: 0; font-size: 14px; font-weight: 600;">${name}</h4>
                    </div>
                    ${address ? `<p style="margin: 0; font-size: 12px; color: #666;">${address}</p>` : ''}
                    ${element.tags?.cuisine ? `<p style="margin: 4px 0 0 0; font-size: 12px;"><strong>Cozinha:</strong> ${element.tags.cuisine}</p>` : ''}
                    ${element.tags?.phone ? `<p style="margin: 4px 0 0 0; font-size: 12px;"><strong>Tel:</strong> ${element.tags.phone}</p>` : ''}
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.addTo(this.map);

            this.poiMarkers.push(marker);
        });
    }

    /**
     * Limpa marcadores de POI
     */
    private clearPOIMarkers(): void {
        this.poiMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.poiMarkers = [];
    }
}

// Expor componente globalmente para callbacks do popup
declare global {
    interface Window {
        paradaMapComponent: ParadasMapComponent;
    }
}