import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';

export interface MapTile {
    x: number;
    y: number;
    z: number; // zoom level
    url: string;
    data?: Blob;
    timestamp: number;
}

export interface MapRegion {
    id: string;
    name: string;
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    zoomLevels: number[];
    tiles: MapTile[];
    downloadProgress: number;
    isComplete: boolean;
    size: number; // em bytes
    lastUpdate: number;
}

export interface DownloadProgress {
    regionId: string;
    totalTiles: number;
    downloadedTiles: number;
    failedTiles: number;
    progress: number;
    estimatedTimeRemaining: number;
    downloadSpeed: number; // tiles por segundo
}

@Injectable({
    providedIn: 'root'
})
export class OfflineMapsService {
    private readonly TILE_SERVER_URL = 'https://tile.openstreetmap.org';
    private readonly STORAGE_KEY = 'offline_maps_regions';
    private readonly MAX_ZOOM_LEVEL = 18;
    private readonly MIN_ZOOM_LEVEL = 1;
    private readonly MAX_CONCURRENT_DOWNLOADS = 3;

    private regionsSubject = new BehaviorSubject<MapRegion[]>([]);
    public regions$ = this.regionsSubject.asObservable();

    private downloadProgressSubject = new BehaviorSubject<DownloadProgress | null>(null);
    public downloadProgress$ = this.downloadProgressSubject.asObservable();

    private activeDownloads = new Map<string, boolean>();

    constructor(
        private cacheService: CacheService,
        private offlineService: OfflineService
    ) {
        this.loadRegions();
    }

    /**
     * Carrega regiões salvas
     */
    private loadRegions(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const regions: MapRegion[] = JSON.parse(stored);
                this.regionsSubject.next(regions);
            }
        } catch (error) {
            console.error('Erro ao carregar regiões de mapas:', error);
        }
    }

    /**
     * Salva regiões no localStorage
     */
    private saveRegions(): void {
        try {
            const regions = this.regionsSubject.value;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(regions));
        } catch (error) {
            console.error('Erro ao salvar regiões de mapas:', error);
        }
    }

    /**
     * Calcula tiles necessários para uma região
     */
    private calculateTiles(region: MapRegion): MapTile[] {
        const tiles: MapTile[] = [];
        const { bounds, zoomLevels } = region;

        for (const zoom of zoomLevels) {
            const minTileX = this.lonToTileX(bounds.west, zoom);
            const maxTileX = this.lonToTileX(bounds.east, zoom);
            const minTileY = this.latToTileY(bounds.north, zoom);
            const maxTileY = this.latToTileY(bounds.south, zoom);

            for (let x = minTileX; x <= maxTileX; x++) {
                for (let y = minTileY; y <= maxTileY; y++) {
                    tiles.push({
                        x,
                        y,
                        z: zoom,
                        url: `${this.TILE_SERVER_URL}/${zoom}/${x}/${y}.png`,
                        timestamp: Date.now()
                    });
                }
            }
        }

        return tiles;
    }

    /**
     * Converte longitude para tile X
     */
    private lonToTileX(lon: number, zoom: number): number {
        return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    }

    /**
     * Converte latitude para tile Y
     */
    private latToTileY(lat: number, zoom: number): number {
        const latRad = lat * Math.PI / 180;
        return Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
    }

    /**
     * Cria nova região para download
     */
    createRegion(
        name: string,
        bounds: { north: number; south: number; east: number; west: number },
        zoomLevels: number[] = [10, 12, 14, 16]
    ): MapRegion {
        const id = `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const region: MapRegion = {
            id,
            name,
            bounds,
            zoomLevels: zoomLevels.filter(z => z >= this.MIN_ZOOM_LEVEL && z <= this.MAX_ZOOM_LEVEL),
            tiles: [],
            downloadProgress: 0,
            isComplete: false,
            size: 0,
            lastUpdate: Date.now()
        };

        region.tiles = this.calculateTiles(region);

        const regions = [...this.regionsSubject.value, region];
        this.regionsSubject.next(regions);
        this.saveRegions();

        return region;
    }

    /**
     * Inicia download de uma região
     */
    async downloadRegion(regionId: string): Promise<void> {
        if (this.activeDownloads.has(regionId)) {
            throw new Error('Download já está em progresso para esta região');
        }

        const regions = this.regionsSubject.value;
        const region = regions.find(r => r.id === regionId);

        if (!region) {
            throw new Error('Região não encontrada');
        }

        if (region.isComplete) {
            throw new Error('Região já foi baixada completamente');
        }

        this.activeDownloads.set(regionId, true);

        try {
            await this.downloadTiles(region);
        } finally {
            this.activeDownloads.delete(regionId);
            this.downloadProgressSubject.next(null);
        }
    }

    /**
     * Baixa tiles de uma região
     */
    private async downloadTiles(region: MapRegion): Promise<void> {
        const tilesToDownload = region.tiles.filter(tile => !tile.data);
        const totalTiles = tilesToDownload.length;
        let downloadedTiles = 0;
        let failedTiles = 0;
        const startTime = Date.now();

        const progress: DownloadProgress = {
            regionId: region.id,
            totalTiles,
            downloadedTiles: 0,
            failedTiles: 0,
            progress: 0,
            estimatedTimeRemaining: 0,
            downloadSpeed: 0
        };

        this.downloadProgressSubject.next(progress);

        // Download em lotes para não sobrecarregar
        const batchSize = this.MAX_CONCURRENT_DOWNLOADS;

        for (let i = 0; i < tilesToDownload.length; i += batchSize) {
            const batch = tilesToDownload.slice(i, i + batchSize);

            const batchPromises = batch.map(async (tile) => {
                try {
                    const response = await fetch(tile.url);
                    if (response.ok) {
                        tile.data = await response.blob();

                        // Cachear tile
                        const cacheKey = `map_tile_${tile.z}_${tile.x}_${tile.y}`;
                        this.cacheService.set(cacheKey, tile.data, this.cacheService.strategies.OFFLINE);

                        downloadedTiles++;
                    } else {
                        failedTiles++;
                        console.warn(`Falha ao baixar tile: ${tile.url}`);
                    }
                } catch (error) {
                    failedTiles++;
                    console.error(`Erro ao baixar tile ${tile.url}:`, error);
                }

                // Atualizar progresso
                const elapsed = Date.now() - startTime;
                const completed = downloadedTiles + failedTiles;
                const downloadSpeed = completed / (elapsed / 1000);
                const remaining = totalTiles - completed;
                const estimatedTimeRemaining = remaining / downloadSpeed * 1000;

                progress.downloadedTiles = downloadedTiles;
                progress.failedTiles = failedTiles;
                progress.progress = (completed / totalTiles) * 100;
                progress.downloadSpeed = downloadSpeed;
                progress.estimatedTimeRemaining = estimatedTimeRemaining;

                this.downloadProgressSubject.next({ ...progress });
            });

            await Promise.all(batchPromises);

            // Pequena pausa entre lotes
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Atualizar região
        region.downloadProgress = 100;
        region.isComplete = failedTiles === 0;
        region.size = this.calculateRegionSize(region);
        region.lastUpdate = Date.now();

        this.updateRegion(region);
    }

    /**
     * Calcula tamanho da região em bytes
     */
    private calculateRegionSize(region: MapRegion): number {
        return region.tiles.reduce((total, tile) => {
            return total + (tile.data ? tile.data.size : 0);
        }, 0);
    }

    /**
     * Atualiza uma região
     */
    private updateRegion(updatedRegion: MapRegion): void {
        const regions = this.regionsSubject.value.map(region =>
            region.id === updatedRegion.id ? updatedRegion : region
        );

        this.regionsSubject.next(regions);
        this.saveRegions();
    }

    /**
     * Remove uma região
     */
    removeRegion(regionId: string): void {
        const regions = this.regionsSubject.value.filter(r => r.id !== regionId);
        this.regionsSubject.next(regions);
        this.saveRegions();

        // Limpar tiles do cache
        this.clearRegionCache(regionId);
    }

    /**
     * Limpa cache de uma região
     */
    private clearRegionCache(regionId: string): void {
        const region = this.regionsSubject.value.find(r => r.id === regionId);
        if (region) {
            region.tiles.forEach(tile => {
                const cacheKey = `map_tile_${tile.z}_${tile.x}_${tile.y}`;
                this.cacheService.delete(cacheKey);
            });
        }
    }

    /**
     * Obtém tile do cache offline
     */
    getOfflineTile(x: number, y: number, z: number): Observable<Blob | null> {
        const cacheKey = `map_tile_${z}_${x}_${y}`;
        const cached = this.cacheService.get<Blob>(cacheKey);

        return of(cached);
    }

    /**
     * Verifica se uma área está disponível offline
     */
    isAreaAvailableOffline(
        lat: number,
        lon: number,
        zoom: number
    ): boolean {
        const regions = this.regionsSubject.value;

        return regions.some(region => {
            if (!region.isComplete) return false;

            const { bounds, zoomLevels } = region;
            const inBounds = lat >= bounds.south && lat <= bounds.north &&
                lon >= bounds.west && lon <= bounds.east;
            const hasZoom = zoomLevels.includes(zoom);

            return inBounds && hasZoom;
        });
    }

    /**
     * Obtém estatísticas das regiões offline
     */
    getOfflineStats(): {
        totalRegions: number;
        completedRegions: number;
        totalSize: number;
        totalTiles: number;
    } {
        const regions = this.regionsSubject.value;

        return {
            totalRegions: regions.length,
            completedRegions: regions.filter(r => r.isComplete).length,
            totalSize: regions.reduce((total, region) => total + region.size, 0),
            totalTiles: regions.reduce((total, region) => total + region.tiles.length, 0)
        };
    }

    /**
     * Limpa regiões antigas
     */
    cleanupOldRegions(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
        const now = Date.now();
        const regions = this.regionsSubject.value;
        const oldRegions = regions.filter(region => now - region.lastUpdate > maxAge);

        oldRegions.forEach(region => {
            this.removeRegion(region.id);
        });

        return oldRegions.length;
    }

    /**
     * Pausa download de uma região
     */
    pauseDownload(regionId: string): void {
        this.activeDownloads.delete(regionId);
        this.downloadProgressSubject.next(null);
    }

    /**
     * Obtém regiões disponíveis
     */
    getRegions(): MapRegion[] {
        return this.regionsSubject.value;
    }

    /**
     * Verifica se há downloads ativos
     */
    hasActiveDownloads(): boolean {
        return this.activeDownloads.size > 0;
    }
}