import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, from } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Firestore, Timestamp, query, where, collection, getDocs } from '@angular/fire/firestore';

import {
    Clima,
    PrevisaoTempo,
    ClimaObservado,
    AlertaClimatico,
    OpenWeatherResponse,
    OpenWeatherForecastResponse
} from '../models/clima.interface';
import { CondicaoClimatica } from '../models/enums';
import { BaseFirestoreService } from '../core/services/base.service';
import { CacheService } from '../core/services/cache.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ClimaService extends BaseFirestoreService<Clima> {
    protected override collectionName = 'clima';
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos
    private readonly API_BASE_URL = environment.weather.baseUrl;
    private readonly API_KEY = environment.weather.apiKey;

    constructor(
        protected override firestore: Firestore,
        private http: HttpClient,
        private cacheService: CacheService
    ) {
        super(firestore);
    }

    /**
     * Busca previsão do tempo para uma localização
     */
    buscarPrevisaoTempo(lat: number, lng: number, cidade: string): Observable<PrevisaoTempo> {
        const cacheKey = `previsao_${lat}_${lng}`;
        const cached = this.cacheService.get<PrevisaoTempo>(cacheKey);

        if (cached) {
            return of(cached);
        }

        const params = new HttpParams()
            .set('lat', lat.toString())
            .set('lon', lng.toString())
            .set('appid', this.API_KEY)
            .set('units', environment.weather.units)
            .set('lang', environment.weather.lang);

        return this.http.get<OpenWeatherResponse>(`${this.API_BASE_URL}/weather`, { params })
            .pipe(
                map(response => this.mapearPrevisaoTempo(response)),
                tap(previsao => this.cacheService.set(cacheKey, previsao, this.cacheService.strategies.LONG)),
                catchError(error => {
                    console.error('Erro ao buscar previsão do tempo:', error);
                    return throwError(() => new Error('Não foi possível obter a previsão do tempo'));
                })
            );
    }

    /**
     * Busca previsão estendida (5 dias) para uma localização
     */
    buscarPrevisaoEstendida(lat: number, lng: number): Observable<PrevisaoTempo[]> {
        const cacheKey = `previsao_estendida_${lat}_${lng}`;
        const cached = this.cacheService.get<PrevisaoTempo[]>(cacheKey);

        if (cached) {
            return of(cached);
        }

        const params = new HttpParams()
            .set('lat', lat.toString())
            .set('lon', lng.toString())
            .set('appid', this.API_KEY)
            .set('units', environment.weather.units)
            .set('lang', environment.weather.lang);

        return this.http.get<OpenWeatherForecastResponse>(`${this.API_BASE_URL}/forecast`, { params })
            .pipe(
                map(response => this.mapearPrevisaoEstendida(response)),
                tap(previsoes => this.cacheService.set(cacheKey, previsoes, this.cacheService.strategies.LONG)),
                catchError(error => {
                    console.error('Erro ao buscar previsão estendida:', error);
                    return throwError(() => new Error('Não foi possível obter a previsão estendida'));
                })
            );
    }

    /**
     * Salva dados climáticos para um dia de viagem
     */
    async salvarClimaDia(
        diaViagemId: string,
        data: string,
        cidade: string,
        coordenadas: { lat: number; lng: number },
        usuarioId: string,
        previsao?: PrevisaoTempo,
        observado?: ClimaObservado
    ): Promise<void> {
        const clima: Omit<Clima, 'id' | 'criadoEm' | 'atualizadoEm'> = {
            diaViagemId,
            data,
            cidade,
            coordenadas,
            previsao,
            observado,
            usuarioId
        };

        // Verificar se já existe registro para este dia
        const existente = await this.recuperarPorDiaViagem(diaViagemId).toPromise();

        if (existente && existente.length > 0) {
            await this.altera(existente[0].id!, {
                previsao,
                observado
            });
        } else {
            await this.novo(clima);
        }
    }

    /**
     * Registra clima observado para um dia
     */
    async registrarClimaObservado(
        diaViagemId: string,
        climaObservado: ClimaObservado
    ): Promise<void> {
        const registros = await this.recuperarPorDiaViagem(diaViagemId).toPromise();

        if (registros && registros.length > 0) {
            await this.altera(registros[0].id!, {
                observado: climaObservado
            });
        } else {
            throw new Error('Registro de clima não encontrado para este dia');
        }
    }

    /**
     * Recupera dados climáticos por dia de viagem
     */
    recuperarPorDiaViagem(diaViagemId: string): Observable<Clima[]> {
        return this.recuperarPorOutroParametro('diaViagemId', diaViagemId);
    }

    /**
     * Recupera dados climáticos por viagem (através dos dias)
     */
    recuperarPorViagem(diasViagemIds: string[]): Observable<Clima[]> {
        if (diasViagemIds.length === 0) {
            return of([]);
        }

        const collectionRef = collection(this.firestore, this.collectionName);
        const q = query(collectionRef, where('diaViagemId', 'in', diasViagemIds));

        return from(getDocs(q)).pipe(
            map(snapshot =>
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Clima))
            )
        );
    }

    /**
     * Lista dados climáticos por viagem (alias para compatibilidade com exportação)
     */
    listarClimaPorViagem(viagemId: string): Observable<Clima[]> {
        // Para implementar corretamente, precisaríamos primeiro buscar os dias da viagem
        // Por simplicidade, retornamos array vazio por enquanto
        // Em implementação completa, buscaria os dias da viagem primeiro
        return of([]);
    }

    /**
     * Gera alertas climáticos baseados na previsão
     */
    gerarAlertas(previsao: PrevisaoTempo): AlertaClimatico[] {
        const alertas: AlertaClimatico[] = [];

        // Alerta de chuva
        if (previsao.chanceChuva >= 70) {
            alertas.push({
                tipo: 'chuva',
                severidade: previsao.chanceChuva >= 90 ? 'alta' : 'media',
                titulo: 'Alta probabilidade de chuva',
                descricao: `${previsao.chanceChuva}% de chance de chuva. Prepare-se com equipamentos adequados.`,
                inicio: new Date().toISOString()
            });
        }

        // Alerta de vento forte
        if (previsao.vento >= 50) {
            alertas.push({
                tipo: 'vento',
                severidade: previsao.vento >= 70 ? 'alta' : 'media',
                titulo: 'Vento forte',
                descricao: `Ventos de ${previsao.vento} km/h. Dirija com cuidado redobrado.`,
                inicio: new Date().toISOString()
            });
        }

        // Alerta de temperatura extrema
        if (previsao.temperaturaMax >= 35) {
            alertas.push({
                tipo: 'temperatura',
                severidade: previsao.temperaturaMax >= 40 ? 'alta' : 'media',
                titulo: 'Temperatura elevada',
                descricao: `Temperatura máxima de ${previsao.temperaturaMax}°C. Mantenha-se hidratado.`,
                inicio: new Date().toISOString()
            });
        }

        if (previsao.temperaturaMin <= 5) {
            alertas.push({
                tipo: 'temperatura',
                severidade: previsao.temperaturaMin <= 0 ? 'alta' : 'media',
                titulo: 'Temperatura baixa',
                descricao: `Temperatura mínima de ${previsao.temperaturaMin}°C. Use roupas adequadas.`,
                inicio: new Date().toISOString()
            });
        }

        return alertas;
    }

    /**
     * Mapeia resposta da API para PrevisaoTempo
     */
    private mapearPrevisaoTempo(response: OpenWeatherResponse): PrevisaoTempo {
        return {
            temperaturaMin: Math.round(response.main.temp_min),
            temperaturaMax: Math.round(response.main.temp_max),
            condicao: this.mapearCondicaoClimatica(response.weather[0].main),
            descricao: response.weather[0].description,
            chanceChuva: this.calcularChanceChuva(response.weather[0].id),
            vento: Math.round(response.wind.speed * 3.6), // m/s para km/h
            umidade: response.main.humidity,
            pressao: response.main.pressure,
            visibilidade: Math.round(response.visibility / 1000), // metros para km
            indiceUV: 0 // OpenWeatherMap gratuito não inclui UV
        };
    }

    /**
     * Mapeia previsão estendida
     */
    private mapearPrevisaoEstendida(response: OpenWeatherForecastResponse): PrevisaoTempo[] {
        // Agrupar por dia (pegar apenas uma previsão por dia, preferencialmente meio-dia)
        const previsoesPorDia = new Map<string, any>();

        response.list.forEach(item => {
            const data = item.dt_txt.split(' ')[0];
            const hora = item.dt_txt.split(' ')[1];

            if (!previsoesPorDia.has(data) || hora === '12:00:00') {
                previsoesPorDia.set(data, item);
            }
        });

        return Array.from(previsoesPorDia.values()).map(item => ({
            temperaturaMin: Math.round(item.main.temp_min),
            temperaturaMax: Math.round(item.main.temp_max),
            condicao: this.mapearCondicaoClimatica(item.weather[0].main),
            descricao: item.weather[0].description,
            chanceChuva: Math.round(item.pop * 100), // Probability of precipitation
            vento: Math.round(item.wind.speed * 3.6),
            umidade: item.main.humidity,
            pressao: item.main.pressure,
            visibilidade: Math.round(item.visibility / 1000)
        }));
    }

    /**
     * Mapeia condição da API para enum local
     */
    private mapearCondicaoClimatica(condicao: string): CondicaoClimatica {
        const mapeamento: { [key: string]: CondicaoClimatica } = {
            'Clear': CondicaoClimatica.ENSOLARADO,
            'Clouds': CondicaoClimatica.NUBLADO,
            'Rain': CondicaoClimatica.CHUVOSO,
            'Drizzle': CondicaoClimatica.CHUVOSO,
            'Thunderstorm': CondicaoClimatica.TEMPESTADE,
            'Snow': CondicaoClimatica.CHUVOSO, // Neve é rara no Brasil
            'Mist': CondicaoClimatica.NEBLINA,
            'Fog': CondicaoClimatica.NEBLINA,
            'Haze': CondicaoClimatica.NEBLINA
        };

        return mapeamento[condicao] || CondicaoClimatica.NUBLADO;
    }

    /**
     * Calcula chance de chuva baseada no código da condição
     */
    private calcularChanceChuva(weatherId: number): number {
        if (weatherId >= 200 && weatherId < 300) return 90; // Tempestade
        if (weatherId >= 300 && weatherId < 400) return 60; // Garoa
        if (weatherId >= 500 && weatherId < 600) return 80; // Chuva
        if (weatherId >= 600 && weatherId < 700) return 70; // Neve
        if (weatherId >= 700 && weatherId < 800) return 20; // Atmosfera
        if (weatherId === 800) return 0; // Céu limpo
        if (weatherId > 800) return 30; // Nuvens

        return 10; // Padrão
    }
}