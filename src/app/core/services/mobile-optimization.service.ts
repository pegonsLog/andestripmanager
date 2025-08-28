import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    screenWidth: number;
    screenHeight: number;
    orientation: 'portrait' | 'landscape';
    touchSupported: boolean;
    devicePixelRatio: number;
    connectionType?: string;
    isLowEndDevice: boolean;
}

export interface PerformanceSettings {
    enableAnimations: boolean;
    imageQuality: 'high' | 'medium' | 'low';
    cacheStrategy: 'aggressive' | 'normal' | 'minimal';
    lazyLoadingThreshold: number;
    maxConcurrentRequests: number;
}

@Injectable({
    providedIn: 'root'
})
export class MobileOptimizationService {
    private deviceInfoSubject = new BehaviorSubject<DeviceInfo>(this.getDeviceInfo());
    public deviceInfo$ = this.deviceInfoSubject.asObservable();

    private performanceSettingsSubject = new BehaviorSubject<PerformanceSettings>(
        this.getOptimalPerformanceSettings()
    );
    public performanceSettings$ = this.performanceSettingsSubject.asObservable();

    // Breakpoints responsivos
    private readonly BREAKPOINTS = {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    };

    constructor() {
        this.initDeviceMonitoring();
        this.initPerformanceOptimization();
    }

    /**
     * Inicializa monitoramento do dispositivo
     */
    private initDeviceMonitoring(): void {
        // Monitorar mudanças de orientação e tamanho da tela
        fromEvent(window, 'resize').pipe(
            debounceTime(250),
            map(() => this.getDeviceInfo()),
            distinctUntilChanged((prev, curr) =>
                prev.screenWidth === curr.screenWidth &&
                prev.screenHeight === curr.screenHeight &&
                prev.orientation === curr.orientation
            )
        ).subscribe(deviceInfo => {
            this.deviceInfoSubject.next(deviceInfo);
            this.updatePerformanceSettings(deviceInfo);
        });

        // Monitorar mudanças de orientação específicas
        fromEvent(window, 'orientationchange').pipe(
            debounceTime(100),
            map(() => this.getDeviceInfo())
        ).subscribe(deviceInfo => {
            this.deviceInfoSubject.next(deviceInfo);
        });
    }

    /**
     * Inicializa otimizações de performance
     */
    private initPerformanceOptimization(): void {
        // Detectar dispositivos de baixo desempenho
        if (this.isLowEndDevice()) {
            this.applyLowEndOptimizations();
        }

        // Otimizar baseado na conexão
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            fromEvent(connection, 'change').subscribe(() => {
                this.updatePerformanceSettings(this.deviceInfoSubject.value);
            });
        }
    }

    /**
     * Obtém informações do dispositivo
     */
    private getDeviceInfo(): DeviceInfo {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        return {
            isMobile: screenWidth <= this.BREAKPOINTS.mobile,
            isTablet: screenWidth > this.BREAKPOINTS.mobile && screenWidth <= this.BREAKPOINTS.tablet,
            isDesktop: screenWidth > this.BREAKPOINTS.tablet,
            screenWidth,
            screenHeight,
            orientation: screenWidth > screenHeight ? 'landscape' : 'portrait',
            touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            devicePixelRatio: window.devicePixelRatio || 1,
            connectionType: this.getConnectionType(),
            isLowEndDevice: this.isLowEndDevice()
        };
    }

    /**
     * Obtém tipo de conexão
     */
    private getConnectionType(): string | undefined {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            return connection.effectiveType || connection.type;
        }
        return undefined;
    }

    /**
     * Detecta se é um dispositivo de baixo desempenho
     */
    private isLowEndDevice(): boolean {
        // Verificar memória disponível
        if ('deviceMemory' in navigator) {
            const memory = (navigator as any).deviceMemory;
            if (memory <= 2) return true; // 2GB ou menos
        }

        // Verificar número de cores do processador
        if ('hardwareConcurrency' in navigator) {
            const cores = navigator.hardwareConcurrency;
            if (cores <= 2) return true; // 2 cores ou menos
        }

        // Verificar user agent para dispositivos conhecidamente lentos
        const userAgent = navigator.userAgent.toLowerCase();
        const lowEndPatterns = [
            'android 4',
            'android 5',
            'iphone os 9',
            'iphone os 10'
        ];

        return lowEndPatterns.some(pattern => userAgent.includes(pattern));
    }

    /**
     * Obtém configurações otimais de performance
     */
    private getOptimalPerformanceSettings(): PerformanceSettings {
        const deviceInfo = this.getDeviceInfo();

        if (deviceInfo.isLowEndDevice) {
            return {
                enableAnimations: false,
                imageQuality: 'low',
                cacheStrategy: 'aggressive',
                lazyLoadingThreshold: 100,
                maxConcurrentRequests: 2
            };
        }

        if (deviceInfo.isMobile) {
            return {
                enableAnimations: true,
                imageQuality: 'medium',
                cacheStrategy: 'normal',
                lazyLoadingThreshold: 200,
                maxConcurrentRequests: 4
            };
        }

        return {
            enableAnimations: true,
            imageQuality: 'high',
            cacheStrategy: 'normal',
            lazyLoadingThreshold: 300,
            maxConcurrentRequests: 6
        };
    }

    /**
     * Atualiza configurações de performance baseado no dispositivo
     */
    private updatePerformanceSettings(deviceInfo: DeviceInfo): void {
        let settings = this.getOptimalPerformanceSettings();

        // Ajustar baseado na conexão
        if (deviceInfo.connectionType) {
            switch (deviceInfo.connectionType) {
                case 'slow-2g':
                case '2g':
                    settings = {
                        ...settings,
                        imageQuality: 'low',
                        cacheStrategy: 'aggressive',
                        maxConcurrentRequests: 1
                    };
                    break;
                case '3g':
                    settings = {
                        ...settings,
                        imageQuality: 'medium',
                        cacheStrategy: 'normal',
                        maxConcurrentRequests: 2
                    };
                    break;
            }
        }

        this.performanceSettingsSubject.next(settings);
    }

    /**
     * Aplica otimizações para dispositivos de baixo desempenho
     */
    private applyLowEndOptimizations(): void {
        // Desabilitar animações CSS desnecessárias
        const style = document.createElement('style');
        style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
        document.head.appendChild(style);

        console.log('Otimizações para dispositivo de baixo desempenho aplicadas');
    }

    /**
     * Verifica se é dispositivo móvel
     */
    isMobile(): boolean {
        return this.deviceInfoSubject.value.isMobile;
    }

    /**
     * Verifica se é tablet
     */
    isTablet(): boolean {
        return this.deviceInfoSubject.value.isTablet;
    }

    /**
     * Verifica se é desktop
     */
    isDesktop(): boolean {
        return this.deviceInfoSubject.value.isDesktop;
    }

    /**
     * Verifica se suporta touch
     */
    isTouchDevice(): boolean {
        return this.deviceInfoSubject.value.touchSupported;
    }

    /**
     * Obtém orientação atual
     */
    getOrientation(): 'portrait' | 'landscape' {
        return this.deviceInfoSubject.value.orientation;
    }

    /**
     * Obtém configurações de performance atuais
     */
    getPerformanceSettings(): PerformanceSettings {
        return this.performanceSettingsSubject.value;
    }

    /**
     * Obtém qualidade de imagem recomendada
     */
    getRecommendedImageQuality(): 'high' | 'medium' | 'low' {
        return this.performanceSettingsSubject.value.imageQuality;
    }

    /**
     * Obtém número máximo de requisições concorrentes
     */
    getMaxConcurrentRequests(): number {
        return this.performanceSettingsSubject.value.maxConcurrentRequests;
    }

    /**
     * Verifica se animações devem ser habilitadas
     */
    shouldEnableAnimations(): boolean {
        return this.performanceSettingsSubject.value.enableAnimations;
    }

    /**
     * Obtém threshold para lazy loading
     */
    getLazyLoadingThreshold(): number {
        return this.performanceSettingsSubject.value.lazyLoadingThreshold;
    }

    /**
     * Força atualização das configurações
     */
    refreshSettings(): void {
        const deviceInfo = this.getDeviceInfo();
        this.deviceInfoSubject.next(deviceInfo);
        this.updatePerformanceSettings(deviceInfo);
    }

    /**
     * Obtém classes CSS responsivas
     */
    getResponsiveClasses(): string[] {
        const deviceInfo = this.deviceInfoSubject.value;
        const classes: string[] = [];

        if (deviceInfo.isMobile) classes.push('mobile');
        if (deviceInfo.isTablet) classes.push('tablet');
        if (deviceInfo.isDesktop) classes.push('desktop');
        if (deviceInfo.touchSupported) classes.push('touch');
        if (deviceInfo.isLowEndDevice) classes.push('low-end');

        classes.push(deviceInfo.orientation);

        return classes;
    }

    /**
     * Obtém viewport meta tag otimizada
     */
    getOptimizedViewportMeta(): string {
        const deviceInfo = this.deviceInfoSubject.value;

        if (deviceInfo.isMobile) {
            return 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
        }

        return 'width=device-width, initial-scale=1.0';
    }

    /**
     * Aplica otimizações de viewport
     */
    applyViewportOptimizations(): void {
        let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }

        viewportMeta.content = this.getOptimizedViewportMeta();
    }

    /**
     * Obtém configurações de cache baseadas no dispositivo
     */
    getCacheConfiguration(): {
        maxSize: number;
        ttl: number;
        strategy: 'aggressive' | 'normal' | 'minimal';
    } {
        const settings = this.performanceSettingsSubject.value;
        const deviceInfo = this.deviceInfoSubject.value;

        let maxSize = 50 * 1024 * 1024; // 50MB padrão
        let ttl = 5 * 60 * 1000; // 5 minutos padrão

        if (deviceInfo.isLowEndDevice) {
            maxSize = 20 * 1024 * 1024; // 20MB
            ttl = 10 * 60 * 1000; // 10 minutos
        } else if (deviceInfo.isMobile) {
            maxSize = 30 * 1024 * 1024; // 30MB
            ttl = 7 * 60 * 1000; // 7 minutos
        }

        return {
            maxSize,
            ttl,
            strategy: settings.cacheStrategy
        };
    }
}