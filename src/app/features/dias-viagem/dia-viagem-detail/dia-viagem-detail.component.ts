import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';

import { DiaViagem, Parada } from '../../../models';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { ParadasService } from '../../../services/paradas.service';

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
export class DiaViagemDetailComponent implements OnInit, OnDestroy {
    @Input() diaId!: string;
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    // Serviços injetados
    private diasViagemService = inject(DiasViagemService);
    private paradasService = inject(ParadasService);

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
    map: google.maps.Map | null = null;
    markers: google.maps.Marker[] = [];
    directionsService: google.maps.DirectionsService | null = null;
    directionsRenderer: google.maps.DirectionsRenderer | null = null;

    ngOnInit(): void {
        if (!this.diaId) {
            console.error('diaId é obrigatório para DiaViagemDetailComponent');
            return;
        }

        this.carregarDados();
        this.initializeGoogleMaps();
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
                        this.updateMap(dia);
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
                    this.updateMapMarkers(paradas);
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

        setTimeout(() => {
            if (this.mapContainer) {
                this.map = new google.maps.Map(this.mapContainer.nativeElement, {
                    zoom: 10,
                    center: { lat: -23.5505, lng: -46.6333 }, // São Paulo como padrão
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    styles: [
                        {
                            featureType: 'poi',
                            elementType: 'labels',
                            stylers: [{ visibility: 'off' }]
                        }
                    ]
                });

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
            }
        }, 100);
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

        const request: google.maps.DirectionsRequest = {
            origin: { lat: origem[0], lng: origem[1] },
            destination: { lat: destino[0], lng: destino[1] },
            travelMode: google.maps.TravelMode.DRIVING,
            avoidHighways: false,
            avoidTolls: false
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

                        const request: google.maps.DirectionsRequest = {
                            origin: origemCoords,
                            destination: destinoCoords,
                            travelMode: google.maps.TravelMode.DRIVING
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
        const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';

        switch (tipo) {
            case 'abastecimento':
                return {
                    url: baseUrl + 'gas_stations.png',
                    scaledSize: new google.maps.Size(32, 32)
                };
            case 'refeicao':
                return {
                    url: baseUrl + 'restaurant.png',
                    scaledSize: new google.maps.Size(32, 32)
                };
            case 'ponto-interesse':
                return {
                    url: baseUrl + 'camera.png',
                    scaledSize: new google.maps.Size(32, 32)
                };
            default:
                return {
                    url: baseUrl + 'red-dot.png',
                    scaledSize: new google.maps.Size(32, 32)
                };
        }
    }

    /**
     * Cria conteúdo da info window
     */
    private createInfoWindowContent(parada: Parada): string {
        let content = `
      <div style="max-width: 200px;">
        <h4 style="margin: 0 0 8px 0;">${parada.nome}</h4>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
          ${this.getTipoParadaLabel(parada.tipo)}
        </p>
    `;

        if (parada.horaChegada || parada.horaSaida) {
            const horario = `${parada.horaChegada || '--:--'}${parada.horaSaida ? ' - ' + parada.horaSaida : ''}`;
            content += `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Horário:</strong> ${horario}</p>`;
        }

        if (parada.observacoes) {
            content += `<p style="margin: 0; font-size: 12px;">${parada.observacoes}</p>`;
        }

        content += '</div>';
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