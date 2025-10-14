import { BaseEntity } from './base.interface';
import { CondicaoClimatica } from './enums';

/**
 * Interface para dados de previsão do tempo
 */
export interface PrevisaoTempo {
    temperaturaMin: number;
    temperaturaMax: number;
    condicao: CondicaoClimatica;
    descricao: string;
    chanceChuva: number; // Porcentagem (0-100)
    vento: number; // km/h
    umidade: number; // Porcentagem (0-100)
    pressao?: number; // hPa
    visibilidade?: number; // km
    indiceUV?: number; // 0-11+
}

/**
 * Interface para dados de clima observado
 */
export interface ClimaObservado {
    temperatura: number;
    condicao: CondicaoClimatica;
    choveu: boolean;
    intensidadeChuva?: 'leve' | 'moderada' | 'forte';
    vento?: number; // km/h
    observacoes?: string;
    horarioRegistro: string; // ISO string
}

/**
 * Interface principal para dados climáticos de um dia
 */
export interface Clima extends BaseEntity {
    diaViagemId: string;
    data: string; // YYYY-MM-DD
    cidade: string;
    coordenadas: {
        lat: number;
        lng: number;
    };
    previsao?: PrevisaoTempo;
    observado?: ClimaObservado;
    alertas?: AlertaClimatico[];
}

/**
 * Interface para alertas climáticos
 */
export interface AlertaClimatico {
    tipo: 'chuva' | 'tempestade' | 'vento' | 'temperatura' | 'visibilidade';
    severidade: 'baixa' | 'media' | 'alta';
    titulo: string;
    descricao: string;
    inicio: string; // ISO string
    fim?: string; // ISO string
}

/**
 * Interface para resposta da API de clima (OpenWeatherMap)
 */
export interface OpenWeatherResponse {
    coord: {
        lon: number;
        lat: number;
    };
    weather: Array<{
        id: number;
        main: string;
        description: string;
        icon: string;
    }>;
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
    };
    visibility: number;
    wind: {
        speed: number;
        deg: number;
    };
    clouds: {
        all: number;
    };
    dt: number;
    sys: {
        country: string;
        sunrise: number;
        sunset: number;
    };
    name: string;
}

/**
 * Interface para previsão de 5 dias da OpenWeatherMap
 */
export interface OpenWeatherForecastResponse {
    list: Array<{
        dt: number;
        main: {
            temp: number;
            temp_min: number;
            temp_max: number;
            pressure: number;
            humidity: number;
        };
        weather: Array<{
            id: number;
            main: string;
            description: string;
            icon: string;
        }>;
        clouds: {
            all: number;
        };
        wind: {
            speed: number;
            deg: number;
        };
        visibility: number;
        pop: number; // Probability of precipitation
        dt_txt: string;
    }>;
    city: {
        id: number;
        name: string;
        coord: {
            lat: number;
            lon: number;
        };
        country: string;
    };
}