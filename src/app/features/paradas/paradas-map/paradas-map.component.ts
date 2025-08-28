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
    inject
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
declare var L: any;

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
export class ParadasMapComponent implements OnInit, OnDestroy, AfterViewInit {
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
                    <p><strong>Tipo:</strong> ${tipoConfig.label}</p>
        `;

        if (parada.endereco) {
            content += `<p><strong>Endereço:</strong> ${parada.endereco}</p>`;
        }

        if (parada.horaChegada) {
            content += `<p><strong>Chegada:</strong> ${parada.horaChegada}</p>`;
        }

        if (parada.custo) {
            content += `<p><strong>Custo:</strong> R$ ${parada.custo.toFixed(2)}</p>`;
        }

        if (parada.observacoes) {
            content += `<p><strong>Observações:</strong> ${parada.observacoes}</p>`;
        }

        content += `
                </div>
                <div class="popup-actions">
                    <button onclick="window.paradaMapComponent.openParadaDetails('${parada.id}')" 
                            class="popup-button">
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
}

// Expor componente globalmente para callbacks do popup
declare global {
    interface Window {
        paradaMapComponent: ParadasMapComponent;
    }
}