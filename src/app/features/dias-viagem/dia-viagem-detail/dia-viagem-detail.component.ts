// @ts-nocheck
import { Component, Input, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { DiaViagem, Parada } from '../../../models';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { ParadasService } from '../../../services/paradas.service';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';

// Declaração global do Google Maps
declare var google: any;

/**
 * Componente para visualização detalhada de um dia de viagem
 * Inclui mapa, paradas, informações climáticas e progresso
 */
@Component({
    selector: 'app-dia-viagem-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDividerModule
    ],
    templateUrl: './dia-viagem-detail.component.html',
    styleUrls: ['./dia-viagem-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiaViagemDetailComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() diaId!: string;
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    // Serviços injetados
    private diasViagemService = inject(DiasViagemService);
    private paradasService = inject(ParadasService);
    private googleMapsLoader = inject(GoogleMapsLoaderService);

    // Controle de ciclo de vida
    private destroy$ = new Subject<void>();

    // Estado do componente
    isLoading$ = new BehaviorSubject<boolean>(false);
    dia$ = new BehaviorSubject<DiaViagem | null>(null);
    paradas$ = new BehaviorSubject<Parada[]>([]);

    // Dados combinados
    dadosCompletos$ = combineLatest([
        this.dia$,
        this.paradas$
    ]).pipe(
        map(([dia, paradas]) => ({
            dia,
            paradas,
            estatisticas: this.calcularEstatisticas(dia, paradas)
        }))
    );

    // Mapa
    map: any = null;
    markers: any[] = [];
    directionsService: any = null;
    directionsRenderer: any = null;
    mapInitialized = false;
    trafficLayer: any = null;
    placesService: any = null;
    placeMarkers: any[] = [];
    
    // Controles de camadas
    showTraffic = true;
    showRestaurants = false;
    showHotels = false;
    showGasStations = false;

    ngOnInit(): void {
        if (!this.diaId) {
            console.error('diaId é obrigatório para DiaViagemDetailComponent');
            return;
        }

        this.carregarDados();
    }

    ngAfterViewInit(): void {
        // Inicializar o mapa após a view estar pronta
        // Usar múltiplas tentativas porque o diálogo pode demorar para renderizar
        this.tryInitializeMap(0);
    }

    /**
     * Tenta inicializar o mapa com retry
     */
    private tryInitializeMap(attempt: number): void {
        const maxAttempts = 5;
        const delay = 300 + (attempt * 200); // Aumenta o delay a cada tentativa

        setTimeout(() => {
            if (this.mapInitialized) {
                return; // Já foi inicializado
            }

            // Primeiro, garantir que o Google Maps está carregado
            this.googleMapsLoader.load().then(() => {
                if (this.mapContainer && this.mapContainer.nativeElement) {
                    console.log('Inicializando mapa na tentativa', attempt + 1);
                    this.initializeGoogleMaps();
                } else if (attempt < maxAttempts) {
                    console.log('mapContainer não disponível, tentativa', attempt + 1, 'de', maxAttempts);
                    this.tryInitializeMap(attempt + 1);
                } else {
                    console.error('Não foi possível inicializar o mapa após', maxAttempts, 'tentativas');
                }
            }).catch((error) => {
                console.error('Erro ao carregar Google Maps API:', error);
                if (attempt < maxAttempts) {
                    this.tryInitializeMap(attempt + 1);
                }
            });
        }, delay);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.cleanupMap();
    }

    /**
     * Carrega dados do dia e paradas
     */
    private carregarDados(): void {
        this.isLoading$.next(true);

        // Carregar dia
        this.diasViagemService.recuperarPorId(this.diaId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dia) => {
                    this.dia$.next(dia || null);
                    if (dia) {
                        this.carregarParadas();
                        // updateMap será chamado quando o mapa for inicializado
                    }
                },
                error: (error) => {
                    console.error('Erro ao carregar dia:', error);
                    this.isLoading$.next(false);
                }
            });
    }

    /**
     * Carrega paradas do dia
     */
    private carregarParadas(): void {
        this.paradasService.listarParadasDia(this.diaId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (paradas) => {
                    this.paradas$.next(paradas);
                    // updateMapMarkers será chamado quando o mapa for inicializado
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar paradas:', error);
                    this.isLoading$.next(false);
                }
            });
    }


    /**
     * Inicializa Google Maps
     */
    private initializeGoogleMaps(): void {
        // Verificar se Google Maps está disponível
        if (typeof google === 'undefined') {
            console.warn('Google Maps não está disponível');
            return;
        }

        if (!this.mapContainer || !this.mapContainer.nativeElement) {
            console.warn('mapContainer não está disponível', {
                hasMapContainer: !!this.mapContainer,
                hasNativeElement: this.mapContainer ? !!this.mapContainer.nativeElement : false
            });
            return;
        }

        // Verificar se o elemento está realmente no DOM e tem dimensões
        const element = this.mapContainer.nativeElement;
        if (!element.offsetParent && element.offsetWidth === 0 && element.offsetHeight === 0) {
            console.warn('mapContainer existe mas não está visível no DOM ainda');
            return;
        }

        try {
            this.map = new google.maps.Map(this.mapContainer.nativeElement, {
                zoom: 10,
                center: { lat: -23.5505, lng: -46.6333 }, // São Paulo como padrão
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.TOP_RIGHT
                },
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_CENTER
                },
                streetViewControl: true,
                fullscreenControl: true
            });

            // Adicionar camada de trânsito
            this.trafficLayer = new google.maps.TrafficLayer();
            this.trafficLayer.setMap(this.map);

            // Inicializar serviço de lugares
            this.placesService = new google.maps.places.PlacesService(this.map);

            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: false,
                polylineOptions: {
                    strokeColor: '#1976d2',
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                }
            });

            this.directionsRenderer.setMap(this.map);
            this.mapInitialized = true;

            // Atualizar o mapa com os dados do dia atual
            const dia = this.dia$.value;
            if (dia) {
                this.updateMap(dia);
            }

            // Atualizar marcadores das paradas
            const paradas = this.paradas$.value;
            if (paradas && paradas.length > 0) {
                this.updateMapMarkers(paradas);
            }
        } catch (error) {
            console.error('Erro ao inicializar Google Maps:', error);
        }
    }

    /**
     * Atualiza o mapa com dados do dia
     */
    private updateMap(dia: DiaViagem): void {
        if (!this.map || !dia.rota) return;

        // Se temos coordenadas, mostrar rota
        if (dia.rota.coordenadasOrigemm && dia.rota.coordenadasDestino) {
            this.showRoute(dia.rota.coordenadasOrigemm, dia.rota.coordenadasDestino);
        } else {
            // Tentar geocodificar origem e destino
            this.geocodeAndShowRoute(dia.origem, dia.destino);
        }
    }

    /**
     * Mostra rota no mapa
     */
    private showRoute(origem: [number, number], destino: [number, number]): void {
        if (!this.directionsService || !this.directionsRenderer) return;

        const dia = this.dia$.value;
        const waypoints: google.maps.DirectionsWaypoint[] = [];

        // Adicionar waypoints se existirem na rota
        if (dia?.rota?.pontosRota && dia.rota.pontosRota.length > 0) {
            // Ordenar pontos pela ordem
            const pontosOrdenados = [...dia.rota.pontosRota].sort((a, b) => a.ordem - b.ordem);
            
            pontosOrdenados.forEach(ponto => {
                waypoints.push({
                    location: { lat: ponto.coordenadas[0], lng: ponto.coordenadas[1] },
                    stopover: ponto.tipo === 'parada' // Paradas são stopovers, waypoints não
                });
            });
        }

        const request: google.maps.DirectionsRequest = {
            origin: { lat: origem[0], lng: origem[1] },
            destination: { lat: destino[0], lng: destino[1] },
            waypoints: waypoints.length > 0 ? waypoints : undefined,
            travelMode: google.maps.TravelMode.DRIVING,
            avoidHighways: false,
            avoidTolls: false,
            optimizeWaypoints: false // Manter a ordem definida pelo usuário
        };

        this.directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                this.directionsRenderer!.setDirections(result);
            } else {
                console.error('Erro ao calcular rota:', status);
            }
        });
    }

    /**
     * Geocodifica endereços e mostra rota
     */
    private geocodeAndShowRoute(origem: string, destino: string): void {
        const geocoder = new google.maps.Geocoder();

        // Geocodificar origem
        geocoder.geocode({ address: origem }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                const origemCoords = results[0].geometry.location;

                // Geocodificar destino
                geocoder.geocode({ address: destino }, (results2, status2) => {
                    if (status2 === google.maps.GeocoderStatus.OK && results2 && results2[0]) {
                        const destinoCoords = results2[0].geometry.location;

                        const dia = this.dia$.value;
                        const waypoints: google.maps.DirectionsWaypoint[] = [];

                        // Adicionar waypoints se existirem na rota
                        if (dia?.rota?.pontosRota && dia.rota.pontosRota.length > 0) {
                            // Ordenar pontos pela ordem
                            const pontosOrdenados = [...dia.rota.pontosRota].sort((a, b) => a.ordem - b.ordem);
                            
                            pontosOrdenados.forEach(ponto => {
                                waypoints.push({
                                    location: { lat: ponto.coordenadas[0], lng: ponto.coordenadas[1] },
                                    stopover: ponto.tipo === 'parada'
                                });
                            });
                        }

                        const request: google.maps.DirectionsRequest = {
                            origin: origemCoords,
                            destination: destinoCoords,
                            waypoints: waypoints.length > 0 ? waypoints : undefined,
                            travelMode: google.maps.TravelMode.DRIVING,
                            optimizeWaypoints: false
                        };

                        this.directionsService!.route(request, (result, status3) => {
                            if (status3 === google.maps.DirectionsStatus.OK && result) {
                                this.directionsRenderer!.setDirections(result);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Atualiza marcadores das paradas no mapa
     */
    private updateMapMarkers(paradas: Parada[]): void {
        if (!this.map) return;

        // Limpar marcadores existentes
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        // Adicionar marcadores das paradas
        paradas.forEach((parada, index) => {
            if (parada.coordenadas) {
                const marker = new google.maps.Marker({
                    position: { lat: parada.coordenadas[0], lng: parada.coordenadas[1] },
                    map: this.map,
                    title: parada.nome,
                    icon: this.getMarkerIcon(parada.tipo),
                    label: {
                        text: (index + 1).toString(),
                        color: 'white',
                        fontWeight: 'bold'
                    }
                });

                // Info window para o marcador
                const infoWindow = new google.maps.InfoWindow({
                    content: this.createInfoWindowContent(parada)
                });

                marker.addListener('click', () => {
                    infoWindow.open(this.map!, marker);
                });

                this.markers.push(marker);
            }
        });
    }

    /**
     * Retorna ícone do marcador baseado no tipo de parada
     */
    private getMarkerIcon(tipo: string): google.maps.Icon {
        // Usar ícones coloridos do Google Maps
        const iconColors: { [key: string]: string } = {
            'abastecimento': 'red',
            'refeicao': 'green',
            'ponto-interesse': 'blue',
            'descanso': 'purple',
            'manutencao': 'orange',
            'hospedagem': 'brown'
        };

        const color = iconColors[tipo] || 'red';
        
        return {
            url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 40)
        };
    }

    /**
     * Cria conteúdo da info window
     */
    private createInfoWindowContent(parada: Parada): string {
        const tipoIcon = this.getTipoParadaIcon(parada.tipo);
        const tipoLabel = this.getTipoParadaLabel(parada.tipo);
        
        let content = `
      <div style="max-width: 280px; font-family: 'Roboto', sans-serif; padding: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #1976d2;">
          <span class="material-icons" style="color: #1976d2; font-size: 24px;">${tipoIcon}</span>
          <div>
            <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">${parada.nome}</h4>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #666; font-weight: 500;">
              ${tipoLabel}
            </p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

        if (parada.endereco) {
            content += `
          <div style="display: flex; align-items: start; gap: 6px;">
            <span class="material-icons" style="color: #666; font-size: 16px;">place</span>
            <span style="font-size: 13px; color: #444; line-height: 1.4;">${parada.endereco}</span>
          </div>
        `;
        }

        if (parada.horaChegada || parada.horaSaida) {
            const horario = parada.horaChegada && parada.horaSaida 
                ? `${parada.horaChegada} - ${parada.horaSaida}`
                : parada.horaChegada || parada.horaSaida || '';
            content += `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-icons" style="color: #666; font-size: 16px;">schedule</span>
            <span style="font-size: 13px; color: #444; font-weight: 500;">${horario}</span>
          </div>
        `;
        }

        if (parada.custo && parada.custo > 0) {
            content += `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-icons" style="color: #4caf50; font-size: 16px;">attach_money</span>
            <span style="font-size: 13px; color: #4caf50; font-weight: 600;">R$ ${parada.custo.toFixed(2)}</span>
          </div>
        `;
        }

        if (parada.duracao && parada.duracao > 0) {
            const horas = Math.floor(parada.duracao / 60);
            const minutos = parada.duracao % 60;
            const duracaoTexto = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;
            content += `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-icons" style="color: #666; font-size: 16px;">timer</span>
            <span style="font-size: 13px; color: #444;">${duracaoTexto}</span>
          </div>
        `;
        }

        if (parada.avaliacao && parada.avaliacao > 0) {
            const estrelas = '⭐'.repeat(parada.avaliacao);
            content += `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-icons" style="color: #ffc107; font-size: 16px;">star</span>
            <span style="font-size: 13px; color: #444;">${estrelas} (${parada.avaliacao}/5)</span>
          </div>
        `;
        }

        if (parada.observacoes) {
            content += `
          <div style="display: flex; align-items: start; gap: 6px; margin-top: 4px; padding-top: 8px; border-top: 1px solid #eee;">
            <span class="material-icons" style="color: #ff9800; font-size: 16px;">info</span>
            <span style="font-size: 12px; color: #666; line-height: 1.4; font-style: italic;">${parada.observacoes}</span>
          </div>
        `;
        }

        content += `
        </div>
      </div>`;
        return content;
    }

    /**
     * Limpa recursos do mapa
     */
    private cleanupMap(): void {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        if (this.directionsRenderer) {
            this.directionsRenderer.setMap(null);
        }

        if (this.trafficLayer) {
            this.trafficLayer.setMap(null);
        }
    }

    /**
     * Busca lugares próximos ao longo da rota
     */
    searchNearbyPlaces(location: google.maps.LatLng, types: string[]): void {
        if (!this.placesService || !this.map) return;

        const request = {
            location: location,
            radius: 5000, // 5km de raio
            types: types
        };

        this.placesService.nearbySearch(request, (results: any[], status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                // Limitar a 10 resultados para não poluir o mapa
                results.slice(0, 10).forEach((place: any) => {
                    this.createPlaceMarker(place);
                });
            }
        });
    }

    /**
     * Cria marcador para um lugar
     */
    private createPlaceMarker(place: any): void {
        if (!place.geometry || !place.geometry.location) return;

        const marker = new google.maps.Marker({
            map: this.map,
            position: place.geometry.location,
            title: place.name,
            icon: {
                url: place.icon,
                scaledSize: new google.maps.Size(25, 25)
            },
            opacity: 0.7
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 8px; max-width: 200px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px;">${place.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">${place.vicinity || ''}</p>
                    ${place.rating ? `<p style="margin: 4px 0 0 0; font-size: 12px;">⭐ ${place.rating}/5</p>` : ''}
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(this.map!, marker);
        });

        this.placeMarkers.push(marker);
    }

    /**
     * Calcula estatísticas do dia
     */
    private calcularEstatisticas(dia: DiaViagem | null, paradas: Parada[]) {
        if (!dia) return null;

        const totalParadas = paradas.length;
        const paradasAbastecimento = paradas.filter(p => p.tipo === 'abastecimento').length;
        const paradasRefeicao = paradas.filter(p => p.tipo === 'refeicao').length;
        const paradasInteresse = paradas.filter(p => p.tipo === 'ponto-interesse').length;

        const progresso = dia.distanciaPercorrida && dia.distanciaPlanejada
            ? Math.min(100, (dia.distanciaPercorrida / dia.distanciaPlanejada) * 100)
            : 0;

        return {
            totalParadas,
            paradasAbastecimento,
            paradasRefeicao,
            paradasInteresse,
            progresso,
            isCompleto: !!(dia.distanciaPercorrida || dia.horaPartidaReal || dia.horaChegadaReal)
        };
    }

    /**
     * Retorna label do tipo de parada
     */
    getTipoParadaLabel(tipo: string): string {
        switch (tipo) {
            case 'abastecimento':
                return 'Abastecimento';
            case 'refeicao':
                return 'Refeição';
            case 'ponto-interesse':
                return 'Ponto de Interesse';
            default:
                return tipo;
        }
    }

    /**
     * Retorna ícone do tipo de parada
     */
    getTipoParadaIcon(tipo: string): string {
        switch (tipo) {
            case 'abastecimento':
                return 'local_gas_station';
            case 'refeicao':
                return 'restaurant';
            case 'ponto-interesse':
                return 'camera_alt';
            default:
                return 'place';
        }
    }

    /**
     * Retorna cor do chip baseado na condição climática
     */
    getClimaColor(condicao?: string): string {
        if (!condicao) return '';

        switch (condicao.toLowerCase()) {
            case 'ensolarado':
            case 'sol':
                return 'primary';
            case 'chuva':
            case 'chuvoso':
            case 'tempestade':
                return 'accent';
            default:
                return '';
        }
    }

    /**
     * Retorna ícone baseado na condição climática
     */
    getClimaIcon(condicao?: string): string {
        if (!condicao) return 'wb_sunny';

        switch (condicao.toLowerCase()) {
            case 'ensolarado':
            case 'sol':
                return 'wb_sunny';
            case 'nublado':
            case 'parcialmente-nublado':
                return 'wb_cloudy';
            case 'chuva':
            case 'chuvoso':
                return 'umbrella';
            case 'tempestade':
                return 'thunderstorm';
            case 'neve':
                return 'ac_unit';
            default:
                return 'wb_sunny';
        }
    }

    /**
     * Formata data para exibição
     */
    formatarData(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    /**
     * Formata distância
     */
    formatarDistancia(km: number): string {
        return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
    }

    /**
     * Formata tempo em minutos
     */
    formatarTempo(minutos: number): string {
        if (!minutos) return '';

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        if (horas === 0) return `${mins}min`;
        if (mins === 0) return `${horas}h`;
        return `${horas}h ${mins}min`;
    }

    /**
     * Centraliza mapa em uma parada
     */
    centralizarParada(parada: Parada): void {
        if (this.map && parada.coordenadas) {
            this.map.setCenter({ lat: parada.coordenadas[0], lng: parada.coordenadas[1] });
            this.map.setZoom(15);
        }
    }

    /**
     * Alterna exibição da camada de trânsito
     */
    toggleTraffic(): void {
        this.showTraffic = !this.showTraffic;
        if (this.trafficLayer) {
            this.trafficLayer.setMap(this.showTraffic ? this.map : null);
        }
    }

    /**
     * Alterna exibição de restaurantes
     */
    toggleRestaurants(): void {
        this.showRestaurants = !this.showRestaurants;
        if (this.showRestaurants) {
            this.clearPlaceMarkers();
            const center = this.map?.getCenter();
            if (center) {
                this.searchNearbyPlaces(center, ['restaurant']);
            }
        } else {
            this.clearPlaceMarkers();
        }
    }

    /**
     * Alterna exibição de hotéis
     */
    toggleHotels(): void {
        this.showHotels = !this.showHotels;
        if (this.showHotels) {
            this.clearPlaceMarkers();
            const center = this.map?.getCenter();
            if (center) {
                this.searchNearbyPlaces(center, ['lodging']);
            }
        } else {
            this.clearPlaceMarkers();
        }
    }

    /**
     * Alterna exibição de postos de gasolina
     */
    toggleGasStations(): void {
        this.showGasStations = !this.showGasStations;
        if (this.showGasStations) {
            this.clearPlaceMarkers();
            const center = this.map?.getCenter();
            if (center) {
                this.searchNearbyPlaces(center, ['gas_station']);
            }
        } else {
            this.clearPlaceMarkers();
        }
    }

    /**
     * Limpa marcadores de lugares
     */
    private clearPlaceMarkers(): void {
        this.placeMarkers.forEach(marker => marker.setMap(null));
        this.placeMarkers = [];
    }
}