import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Serviço para carregar o Google Maps API de forma dinâmica
 * Mantém a chave da API segura no arquivo environment.ts (não commitado)
 */
@Injectable({
    providedIn: 'root'
})
export class GoogleMapsLoaderService {
    private static scriptLoaded = false;
    private static scriptLoading = false;
    private static loadPromise: Promise<void> | null = null;

    /**
     * Carrega o script do Google Maps API
     * @returns Promise que resolve quando o script está carregado
     */
    load(): Promise<void> {
        // Se já está carregado, retorna imediatamente
        if (GoogleMapsLoaderService.scriptLoaded) {
            return Promise.resolve();
        }

        // Se já está carregando, retorna a promise existente
        if (GoogleMapsLoaderService.scriptLoading && GoogleMapsLoaderService.loadPromise) {
            return GoogleMapsLoaderService.loadPromise;
        }

        // Inicia o carregamento
        GoogleMapsLoaderService.scriptLoading = true;
        GoogleMapsLoaderService.loadPromise = new Promise<void>((resolve, reject) => {
            // Verificar se já existe o script (caso tenha sido carregado de outra forma)
            if (typeof google !== 'undefined' && google.maps) {
                GoogleMapsLoaderService.scriptLoaded = true;
                GoogleMapsLoaderService.scriptLoading = false;
                resolve();
                return;
            }

            // Criar o elemento script
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.defer = true;

            // Construir a URL com a chave da API do environment
            const apiKey = (environment as any).googleMaps?.apiKey || '';
            if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
                console.warn('Google Maps API key não configurada no environment.ts');
            }

            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR`;

            // Callbacks de sucesso e erro
            script.onload = () => {
                GoogleMapsLoaderService.scriptLoaded = true;
                GoogleMapsLoaderService.scriptLoading = false;
                console.log('Google Maps API carregado com sucesso');
                resolve();
            };

            script.onerror = (error) => {
                GoogleMapsLoaderService.scriptLoading = false;
                console.error('Erro ao carregar Google Maps API:', error);
                reject(error);
            };

            // Adicionar o script ao head
            document.head.appendChild(script);
        });

        return GoogleMapsLoaderService.loadPromise;
    }

    /**
     * Verifica se o Google Maps está carregado
     */
    isLoaded(): boolean {
        return GoogleMapsLoaderService.scriptLoaded && typeof google !== 'undefined' && !!google.maps;
    }
}
