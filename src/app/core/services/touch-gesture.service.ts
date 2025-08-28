import { Injectable } from '@angular/core';
import { Observable, fromEvent, merge } from 'rxjs';
import { map, filter, switchMap, takeUntil, tap } from 'rxjs/operators';

export interface TouchPoint {
    x: number;
    y: number;
    timestamp: number;
}

export interface SwipeGesture {
    direction: 'left' | 'right' | 'up' | 'down';
    distance: number;
    duration: number;
    velocity: number;
    startPoint: TouchPoint;
    endPoint: TouchPoint;
}

export interface PinchGesture {
    scale: number;
    center: TouchPoint;
    distance: number;
}

export interface TapGesture {
    point: TouchPoint;
    tapCount: number;
    duration: number;
}

@Injectable({
    providedIn: 'root'
})
export class TouchGestureService {
    private readonly MIN_SWIPE_DISTANCE = 50;
    private readonly MAX_SWIPE_TIME = 1000;
    private readonly MIN_SWIPE_VELOCITY = 0.1;
    private readonly DOUBLE_TAP_DELAY = 300;
    private readonly LONG_PRESS_DELAY = 500;

    constructor() { }

    /**
     * Detecta gestos de swipe em um elemento
     */
    detectSwipe(element: HTMLElement): Observable<SwipeGesture> {
        return new Observable(observer => {
            let startPoint: TouchPoint | null = null;
            let startTime: number = 0;

            const touchStart = (event: TouchEvent) => {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    startPoint = {
                        x: touch.clientX,
                        y: touch.clientY,
                        timestamp: Date.now()
                    };
                    startTime = Date.now();
                }
            };

            const touchEnd = (event: TouchEvent) => {
                if (startPoint && event.changedTouches.length === 1) {
                    const touch = event.changedTouches[0];
                    const endPoint: TouchPoint = {
                        x: touch.clientX,
                        y: touch.clientY,
                        timestamp: Date.now()
                    };

                    const deltaX = endPoint.x - startPoint.x;
                    const deltaY = endPoint.y - startPoint.y;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    const duration = endPoint.timestamp - startPoint.timestamp;
                    const velocity = distance / duration;

                    if (distance >= this.MIN_SWIPE_DISTANCE &&
                        duration <= this.MAX_SWIPE_TIME &&
                        velocity >= this.MIN_SWIPE_VELOCITY) {

                        let direction: 'left' | 'right' | 'up' | 'down';

                        if (Math.abs(deltaX) > Math.abs(deltaY)) {
                            direction = deltaX > 0 ? 'right' : 'left';
                        } else {
                            direction = deltaY > 0 ? 'down' : 'up';
                        }

                        const swipeGesture: SwipeGesture = {
                            direction,
                            distance,
                            duration,
                            velocity,
                            startPoint,
                            endPoint
                        };

                        observer.next(swipeGesture);
                    }

                    startPoint = null;
                }
            };

            element.addEventListener('touchstart', touchStart, { passive: true });
            element.addEventListener('touchend', touchEnd, { passive: true });

            return () => {
                element.removeEventListener('touchstart', touchStart);
                element.removeEventListener('touchend', touchEnd);
            };
        });
    }

    /**
     * Detecta gestos de pinch (zoom) em um elemento
     */
    detectPinch(element: HTMLElement): Observable<PinchGesture> {
        return new Observable(observer => {
            let initialDistance: number = 0;
            let initialCenter: TouchPoint | null = null;

            const getDistance = (touch1: Touch, touch2: Touch): number => {
                const dx = touch1.clientX - touch2.clientX;
                const dy = touch1.clientY - touch2.clientY;
                return Math.sqrt(dx * dx + dy * dy);
            };

            const getCenter = (touch1: Touch, touch2: Touch): TouchPoint => {
                return {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2,
                    timestamp: Date.now()
                };
            };

            const touchStart = (event: TouchEvent) => {
                if (event.touches.length === 2) {
                    const touch1 = event.touches[0];
                    const touch2 = event.touches[1];

                    initialDistance = getDistance(touch1, touch2);
                    initialCenter = getCenter(touch1, touch2);
                }
            };

            const touchMove = (event: TouchEvent) => {
                if (event.touches.length === 2 && initialDistance && initialCenter) {
                    event.preventDefault();

                    const touch1 = event.touches[0];
                    const touch2 = event.touches[1];

                    const currentDistance = getDistance(touch1, touch2);
                    const currentCenter = getCenter(touch1, touch2);
                    const scale = currentDistance / initialDistance;

                    const pinchGesture: PinchGesture = {
                        scale,
                        center: currentCenter,
                        distance: currentDistance
                    };

                    observer.next(pinchGesture);
                }
            };

            const touchEnd = (event: TouchEvent) => {
                if (event.touches.length < 2) {
                    initialDistance = 0;
                    initialCenter = null;
                }
            };

            element.addEventListener('touchstart', touchStart, { passive: true });
            element.addEventListener('touchmove', touchMove, { passive: false });
            element.addEventListener('touchend', touchEnd, { passive: true });

            return () => {
                element.removeEventListener('touchstart', touchStart);
                element.removeEventListener('touchmove', touchMove);
                element.removeEventListener('touchend', touchEnd);
            };
        });
    }

    /**
     * Detecta taps (incluindo double tap) em um elemento
     */
    detectTap(element: HTMLElement): Observable<TapGesture> {
        return new Observable(observer => {
            let lastTapTime = 0;
            let tapCount = 0;
            let tapTimer: any = null;

            const touchStart = (event: TouchEvent) => {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    const currentTime = Date.now();

                    if (currentTime - lastTapTime < this.DOUBLE_TAP_DELAY) {
                        tapCount++;
                    } else {
                        tapCount = 1;
                    }

                    lastTapTime = currentTime;

                    // Limpar timer anterior
                    if (tapTimer) {
                        clearTimeout(tapTimer);
                    }

                    // Aguardar para ver se haverá outro tap
                    tapTimer = setTimeout(() => {
                        const tapGesture: TapGesture = {
                            point: {
                                x: touch.clientX,
                                y: touch.clientY,
                                timestamp: currentTime
                            },
                            tapCount,
                            duration: 0
                        };

                        observer.next(tapGesture);
                        tapCount = 0;
                    }, this.DOUBLE_TAP_DELAY);
                }
            };

            element.addEventListener('touchstart', touchStart, { passive: true });

            return () => {
                element.removeEventListener('touchstart', touchStart);
                if (tapTimer) {
                    clearTimeout(tapTimer);
                }
            };
        });
    }

    /**
     * Detecta long press em um elemento
     */
    detectLongPress(element: HTMLElement): Observable<TouchPoint> {
        return new Observable(observer => {
            let longPressTimer: any = null;
            let startPoint: TouchPoint | null = null;

            const touchStart = (event: TouchEvent) => {
                if (event.touches.length === 1) {
                    const touch = event.touches[0];
                    startPoint = {
                        x: touch.clientX,
                        y: touch.clientY,
                        timestamp: Date.now()
                    };

                    longPressTimer = setTimeout(() => {
                        if (startPoint) {
                            observer.next(startPoint);
                        }
                    }, this.LONG_PRESS_DELAY);
                }
            };

            const touchEnd = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                startPoint = null;
            };

            const touchMove = (event: TouchEvent) => {
                if (startPoint && event.touches.length === 1) {
                    const touch = event.touches[0];
                    const deltaX = touch.clientX - startPoint.x;
                    const deltaY = touch.clientY - startPoint.y;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    // Cancelar long press se mover muito
                    if (distance > 10) {
                        if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            longPressTimer = null;
                        }
                    }
                }
            };

            element.addEventListener('touchstart', touchStart, { passive: true });
            element.addEventListener('touchend', touchEnd, { passive: true });
            element.addEventListener('touchmove', touchMove, { passive: true });

            return () => {
                element.removeEventListener('touchstart', touchStart);
                element.removeEventListener('touchend', touchEnd);
                element.removeEventListener('touchmove', touchMove);
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                }
            };
        });
    }

    /**
     * Adiciona suporte a gestos em um elemento
     */
    enableGestures(element: HTMLElement): {
        swipe$: Observable<SwipeGesture>;
        pinch$: Observable<PinchGesture>;
        tap$: Observable<TapGesture>;
        longPress$: Observable<TouchPoint>;
    } {
        return {
            swipe$: this.detectSwipe(element),
            pinch$: this.detectPinch(element),
            tap$: this.detectTap(element),
            longPress$: this.detectLongPress(element)
        };
    }

    /**
     * Previne comportamentos padrão de touch em um elemento
     */
    preventDefaultTouch(element: HTMLElement): void {
        const preventDefault = (event: TouchEvent) => {
            event.preventDefault();
        };

        element.addEventListener('touchstart', preventDefault, { passive: false });
        element.addEventListener('touchmove', preventDefault, { passive: false });
        element.addEventListener('touchend', preventDefault, { passive: false });
    }

    /**
     * Habilita scroll suave para dispositivos touch
     */
    enableSmoothScroll(element: HTMLElement): void {
        element.style.webkitOverflowScrolling = 'touch';
        element.style.overflowScrolling = 'touch';
    }

    /**
     * Adiciona feedback tátil (vibração) se disponível
     */
    addHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
        if ('vibrate' in navigator) {
            let pattern: number[];

            switch (type) {
                case 'light':
                    pattern = [10];
                    break;
                case 'medium':
                    pattern = [20];
                    break;
                case 'heavy':
                    pattern = [50];
                    break;
            }

            navigator.vibrate(pattern);
        }
    }

    /**
     * Detecta se o dispositivo suporta gestos
     */
    supportsGestures(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Obtém informações sobre capacidades de touch
     */
    getTouchCapabilities(): {
        maxTouchPoints: number;
        supportsMultiTouch: boolean;
        supportsPressure: boolean;
    } {
        return {
            maxTouchPoints: navigator.maxTouchPoints || 0,
            supportsMultiTouch: navigator.maxTouchPoints > 1,
            supportsPressure: 'force' in TouchEvent.prototype
        };
    }
}