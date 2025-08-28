/**
 * Testes de Integração - ClimaService
 * 
 * Testa a integração do ClimaService com Firestore, HttpClient, CacheService,
 * incluindo operações com API externa, cache e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { ClimaService } from './clima.service';
import { CacheService } from '../core/services/cache.service';
import { 
    Clima, 
    PrevisaoTempo, 
    ClimaObservado, 
    OpenWeatherResponse, 
    OpenWeatherForecastResponse 
} from '../models/clima.interface';
import { CondicaoClimatica } from '../models/enums';
import { MockDataFactory } from '../testing/test-utils';
import { environment } from '../../environments/environment';

describe('ClimaService - Testes de Integração', () => {
    let service: ClimaService;
    let httpMock: HttpTestingController;
    let mockFirestore: any;
    let mockCacheService: jasmine.SpyObj<CacheService>;

    const mockClima: Clima = MockDataFactory.createClima();
    const mockPrevisaoTempo: PrevisaoTempo = MockDataFactory.createPrevisaoTempo();
    const mockClimaObservado: ClimaObservado = MockDataFactory.createClimaObservado();

    const mockOpenWeatherResponse: OpenWeatherResponse = {
        main: {
            temp: 25,
            temp_min: 20,
            temp_max: 30,
            humidity: 65,
            pressure: 1013
        },
        weather: [{
            id: 800,
            main: 'Clear',
            description: 'céu limpo',
            icon: '01d'
        }],
        wind: {
            speed: 5.5,
            deg: 180
        },
        visibility: 10000,
        name: 'São Paulo'
    };

    const mockForecastResponse: OpenWeatherForecastResponse = {
        list: [
            {
                dt: 1640995200,
                dt_txt: '2024-06-01 12:00:00',
                main: {
                    temp: 25,
                    temp_min: 20,
                    temp_max: 30,
                    humidity: 65,
                    pressure: 1013
                },
                weather: [{
                    id: 800,
                    main: 'Clear',
                    description: 'céu limpo',
                    icon: '01d'
                }],
                wind: {
                    speed: 5.5,
                    deg: 180
                },
                visibility: 10000,
                pop: 0.1
            },
            {
                dt: 1641081600,
                dt_txt: '2024-06-02 12:00:00',
                main: {
                    temp: 28,
                    temp_min: 22,
                    temp_max: 32,
                    humidity: 70,
                    pressure: 1010
                },
                weather: [{
                    id: 500,
                    main: 'Rain',
                    description: 'chuva leve',
                    icon: '10d'
                }],
                wind: {
                    speed: 8.0,
                    deg: 200
                },
                visibility: 8000,
                pop: 0.8
            }
        ]
    };

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-clima-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockClima.id,
                data: () => mockClima
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: [{
                    id: mockClima.id,
                    data: () => mockClima
                }]
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({})
        };

        // Mock do CacheService
        const cacheSpy = jasmine.createSpyObj('CacheService', ['get', 'set', 'clear']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                ClimaService,
                { provide: Firestore, useValue: mockFirestore },
                { provide: CacheService, useValue: cacheSpy }
            ]
        });

        service = TestBed.inject(ClimaService);
        httpMock = TestBed.inject(HttpTestingController);
        mockCacheService = TestBed.inject(CacheService) as jasmine.SpyObj<CacheService>;
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('Integração com API Externa - Previsão do Tempo', () => {
        it('deve buscar previsão do tempo da API e mapear corretamente', (done) => {
            const lat = -23.5505;
            const lng = -46.6333;
            const cidade = 'São Paulo';

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(lat, lng, cidade).subscribe(previsao => {
                expect(previsao.temperaturaMin).toBe(20);
                expect(previsao.temperaturaMax).toBe(30);
                expect(previsao.condicao).toBe(CondicaoClimatica.ENSOLARADO);
                expect(previsao.vento).toBe(20); // 5.5 m/s * 3.6 = 19.8 ≈ 20
                expect(previsao.umidade).toBe(65);
                expect(previsao.chanceChuva).toBe(0); // Clear sky = 0%

                expect(mockCacheService.set).toHaveBeenCalled();
                done();
            });

            const req = httpMock.expectOne(request => 
                request.url.includes('/weather') && 
                request.params.get('lat') === lat.toString() &&
                request.params.get('lon') === lng.toString()
            );
            expect(req.request.method).toBe('GET');
            req.flush(mockOpenWeatherResponse);
        });

        it('deve usar cache quando disponível', (done) => {
            const lat = -23.5505;
            const lng = -46.6333;
            const cidade = 'São Paulo';

            mockCacheService.get.and.returnValue(mockPrevisaoTempo);

            service.buscarPrevisaoTempo(lat, lng, cidade).subscribe(previsao => {
                expect(previsao).toEqual(mockPrevisaoTempo);
                expect(mockCacheService.get).toHaveBeenCalledWith(`previsao_${lat}_${lng}`);
                done();
            });

            // Não deve fazer requisição HTTP se tem cache
            httpMock.expectNone(request => request.url.includes('/weather'));
        });

        it('deve tratar erro da API externa', (done) => {
            const lat = -23.5505;
            const lng = -46.6333;
            const cidade = 'São Paulo';

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(lat, lng, cidade).subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toBe('Não foi possível obter a previsão do tempo');
                    done();
                }
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.error(new ErrorEvent('Network error'));
        });

        it('deve buscar previsão estendida e mapear múltiplos dias', (done) => {
            const lat = -23.5505;
            const lng = -46.6333;

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoEstendida(lat, lng).subscribe(previsoes => {
                expect(previsoes.length).toBe(2);
                
                // Primeiro dia (Clear)
                expect(previsoes[0].condicao).toBe(CondicaoClimatica.ENSOLARADO);
                expect(previsoes[0].chanceChuva).toBe(10); // pop: 0.1 = 10%
                
                // Segundo dia (Rain)
                expect(previsoes[1].condicao).toBe(CondicaoClimatica.CHUVOSO);
                expect(previsoes[1].chanceChuva).toBe(80); // pop: 0.8 = 80%

                expect(mockCacheService.set).toHaveBeenCalled();
                done();
            });

            const req = httpMock.expectOne(request => request.url.includes('/forecast'));
            expect(req.request.method).toBe('GET');
            req.flush(mockForecastResponse);
        });
    });

    describe('Integração com Firestore - Dados Climáticos', () => {
        it('deve salvar dados climáticos para um dia de viagem', async () => {
            const diaViagemId = 'dia-123';
            const data = '2024-06-01';
            const cidade = 'São Paulo';
            const coordenadas = { lat: -23.5505, lng: -46.6333 };
            const usuarioId = 'user-123';

            // Simular que não existe registro anterior
            mockFirestore.getDocs.and.returnValue(Promise.resolve({ docs: [] }));

            await service.salvarClimaDia(
                diaViagemId,
                data,
                cidade,
                coordenadas,
                usuarioId,
                mockPrevisaoTempo,
                mockClimaObservado
            );

            expect(mockFirestore.addDoc).toHaveBeenCalled();
            
            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            
            expect(dadosPassados.diaViagemId).toBe(diaViagemId);
            expect(dadosPassados.data).toBe(data);
            expect(dadosPassados.cidade).toBe(cidade);
            expect(dadosPassados.coordenadas).toEqual(coordenadas);
            expect(dadosPassados.usuarioId).toBe(usuarioId);
            expect(dadosPassados.previsao).toEqual(mockPrevisaoTempo);
            expect(dadosPassados.observado).toEqual(mockClimaObservado);
        });

        it('deve atualizar registro existente ao salvar clima do dia', async () => {
            const diaViagemId = 'dia-123';
            const data = '2024-06-01';
            const cidade = 'São Paulo';
            const coordenadas = { lat: -23.5505, lng: -46.6333 };
            const usuarioId = 'user-123';

            // Simular que já existe registro
            const registroExistente = { ...mockClima, id: 'clima-existente' };
            spyOn(service, 'recuperarPorDiaViagem').and.returnValue(of([registroExistente]));

            await service.salvarClimaDia(
                diaViagemId,
                data,
                cidade,
                coordenadas,
                usuarioId,
                mockPrevisaoTempo
            );

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            expect(mockFirestore.addDoc).not.toHaveBeenCalled();
        });

        it('deve registrar clima observado em registro existente', async () => {
            const diaViagemId = 'dia-123';
            const registroExistente = { ...mockClima, id: 'clima-existente' };

            spyOn(service, 'recuperarPorDiaViagem').and.returnValue(of([registroExistente]));

            await service.registrarClimaObservado(diaViagemId, mockClimaObservado);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.observado).toEqual(mockClimaObservado);
        });

        it('deve lançar erro ao tentar registrar clima observado sem registro existente', async () => {
            const diaViagemId = 'dia-inexistente';

            spyOn(service, 'recuperarPorDiaViagem').and.returnValue(of([]));

            await expectAsync(service.registrarClimaObservado(diaViagemId, mockClimaObservado))
                .toBeRejectedWithError('Registro de clima não encontrado para este dia');
        });

        it('deve recuperar dados climáticos por dia de viagem', (done) => {
            const diaViagemId = 'dia-123';

            service.recuperarPorDiaViagem(diaViagemId).subscribe(climas => {
                expect(climas.length).toBe(1);
                expect(climas[0]).toEqual({
                    id: mockClima.id,
                    ...mockClima
                });
                expect(mockFirestore.where).toHaveBeenCalledWith('diaViagemId', '==', diaViagemId);
                done();
            });
        });

        it('deve recuperar dados climáticos por múltiplos dias de viagem', (done) => {
            const diasViagemIds = ['dia-1', 'dia-2', 'dia-3'];

            service.recuperarPorViagem(diasViagemIds).subscribe(climas => {
                expect(climas.length).toBe(1);
                expect(mockFirestore.where).toHaveBeenCalledWith('diaViagemId', 'in', diasViagemIds);
                done();
            });
        });

        it('deve retornar array vazio para lista vazia de dias', (done) => {
            service.recuperarPorViagem([]).subscribe(climas => {
                expect(climas).toEqual([]);
                done();
            });
        });
    });

    describe('Geração de Alertas Climáticos', () => {
        it('deve gerar alerta de chuva para alta probabilidade', () => {
            const previsaoChuvosa: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                chanceChuva: 85
            };

            const alertas = service.gerarAlertas(previsaoChuvosa);

            const alertaChuva = alertas.find(a => a.tipo === 'chuva');
            expect(alertaChuva).toBeDefined();
            expect(alertaChuva!.severidade).toBe('media');
            expect(alertaChuva!.titulo).toBe('Alta probabilidade de chuva');
            expect(alertaChuva!.descricao).toContain('85%');
        });

        it('deve gerar alerta de chuva com severidade alta', () => {
            const previsaoChuvosa: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                chanceChuva: 95
            };

            const alertas = service.gerarAlertas(previsaoChuvosa);

            const alertaChuva = alertas.find(a => a.tipo === 'chuva');
            expect(alertaChuva!.severidade).toBe('alta');
        });

        it('deve gerar alerta de vento forte', () => {
            const previsaoVentosa: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                vento: 60
            };

            const alertas = service.gerarAlertas(previsaoVentosa);

            const alertaVento = alertas.find(a => a.tipo === 'vento');
            expect(alertaVento).toBeDefined();
            expect(alertaVento!.severidade).toBe('media');
            expect(alertaVento!.titulo).toBe('Vento forte');
            expect(alertaVento!.descricao).toContain('60 km/h');
        });

        it('deve gerar alerta de temperatura elevada', () => {
            const previsaoQuente: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                temperaturaMax: 38
            };

            const alertas = service.gerarAlertas(previsaoQuente);

            const alertaTemp = alertas.find(a => a.tipo === 'temperatura');
            expect(alertaTemp).toBeDefined();
            expect(alertaTemp!.titulo).toBe('Temperatura elevada');
            expect(alertaTemp!.descricao).toContain('38°C');
        });

        it('deve gerar alerta de temperatura baixa', () => {
            const previsaoFria: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                temperaturaMin: 2
            };

            const alertas = service.gerarAlertas(previsaoFria);

            const alertaTemp = alertas.find(a => a.tipo === 'temperatura');
            expect(alertaTemp).toBeDefined();
            expect(alertaTemp!.titulo).toBe('Temperatura baixa');
            expect(alertaTemp!.descricao).toContain('2°C');
        });

        it('deve gerar múltiplos alertas quando necessário', () => {
            const previsaoExtrema: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                chanceChuva: 90,
                vento: 75,
                temperaturaMax: 42,
                temperaturaMin: -2
            };

            const alertas = service.gerarAlertas(previsaoExtrema);

            expect(alertas.length).toBe(4);
            expect(alertas.some(a => a.tipo === 'chuva')).toBe(true);
            expect(alertas.some(a => a.tipo === 'vento')).toBe(true);
            expect(alertas.filter(a => a.tipo === 'temperatura').length).toBe(2);
        });

        it('deve não gerar alertas para condições normais', () => {
            const previsaoNormal: PrevisaoTempo = {
                ...mockPrevisaoTempo,
                chanceChuva: 20,
                vento: 15,
                temperaturaMax: 28,
                temperaturaMin: 18
            };

            const alertas = service.gerarAlertas(previsaoNormal);

            expect(alertas.length).toBe(0);
        });
    });

    describe('Mapeamento de Dados da API', () => {
        it('deve mapear condições climáticas corretamente', () => {
            const testCases = [
                { input: 'Clear', expected: CondicaoClimatica.ENSOLARADO },
                { input: 'Clouds', expected: CondicaoClimatica.NUBLADO },
                { input: 'Rain', expected: CondicaoClimatica.CHUVOSO },
                { input: 'Thunderstorm', expected: CondicaoClimatica.TEMPESTADE },
                { input: 'Mist', expected: CondicaoClimatica.NEBLINA },
                { input: 'Unknown', expected: CondicaoClimatica.NUBLADO }
            ];

            testCases.forEach(testCase => {
                const response = {
                    ...mockOpenWeatherResponse,
                    weather: [{
                        ...mockOpenWeatherResponse.weather[0],
                        main: testCase.input
                    }]
                };

                mockCacheService.get.and.returnValue(null);

                service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(previsao => {
                    expect(previsao.condicao).toBe(testCase.expected);
                });

                const req = httpMock.expectOne(request => request.url.includes('/weather'));
                req.flush(response);
            });
        });

        it('deve calcular chance de chuva baseada no código da condição', () => {
            const testCases = [
                { weatherId: 200, expectedChance: 90 }, // Tempestade
                { weatherId: 300, expectedChance: 60 }, // Garoa
                { weatherId: 500, expectedChance: 80 }, // Chuva
                { weatherId: 600, expectedChance: 70 }, // Neve
                { weatherId: 701, expectedChance: 20 }, // Atmosfera
                { weatherId: 800, expectedChance: 0 },  // Céu limpo
                { weatherId: 801, expectedChance: 30 }, // Nuvens
                { weatherId: 999, expectedChance: 10 }  // Desconhecido
            ];

            testCases.forEach(testCase => {
                const response = {
                    ...mockOpenWeatherResponse,
                    weather: [{
                        ...mockOpenWeatherResponse.weather[0],
                        id: testCase.weatherId
                    }]
                };

                mockCacheService.get.and.returnValue(null);

                service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(previsao => {
                    expect(previsao.chanceChuva).toBe(testCase.expectedChance);
                });

                const req = httpMock.expectOne(request => request.url.includes('/weather'));
                req.flush(response);
            });
        });

        it('deve converter velocidade do vento de m/s para km/h', (done) => {
            const response = {
                ...mockOpenWeatherResponse,
                wind: { speed: 10, deg: 180 } // 10 m/s = 36 km/h
            };

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(previsao => {
                expect(previsao.vento).toBe(36);
                done();
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(response);
        });

        it('deve converter visibilidade de metros para quilômetros', (done) => {
            const response = {
                ...mockOpenWeatherResponse,
                visibility: 5000 // 5000m = 5km
            };

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(previsao => {
                expect(previsao.visibilidade).toBe(5);
                done();
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(response);
        });
    });

    describe('Tratamento de Erros e Cenários Especiais', () => {
        it('deve tratar erro de API key inválida', (done) => {
            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toBe('Não foi possível obter a previsão do tempo');
                    done();
                }
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.error(new ErrorEvent('Unauthorized'), { status: 401 });
        });

        it('deve tratar timeout da API', (done) => {
            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toBe('Não foi possível obter a previsão do tempo');
                    done();
                }
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.error(new ErrorEvent('Timeout'), { status: 408 });
        });

        it('deve tratar coordenadas inválidas', (done) => {
            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(999, 999, 'Localização Inválida').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toBe('Não foi possível obter a previsão do tempo');
                    done();
                }
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.error(new ErrorEvent('Bad Request'), { status: 400 });
        });

        it('deve lidar com resposta da API sem dados de vento', (done) => {
            const responseIncompleta = {
                ...mockOpenWeatherResponse,
                wind: undefined
            };

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(previsao => {
                expect(previsao.vento).toBe(0); // Deve usar valor padrão
                done();
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(responseIncompleta);
        });

        it('deve lidar com resposta da API sem dados de visibilidade', (done) => {
            const responseIncompleta = {
                ...mockOpenWeatherResponse,
                visibility: undefined
            };

            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(previsao => {
                expect(previsao.visibilidade).toBe(0); // Deve usar valor padrão
                done();
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(responseIncompleta);
        });
    });

    describe('Integração com Cache', () => {
        it('deve definir TTL correto no cache', (done) => {
            mockCacheService.get.and.returnValue(null);

            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe(() => {
                expect(mockCacheService.set).toHaveBeenCalledWith(
                    'previsao_-23.5505_-46.6333',
                    jasmine.any(Object),
                    30 * 60 * 1000 // 30 minutos
                );
                done();
            });

            const req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(mockOpenWeatherResponse);
        });

        it('deve usar chaves de cache diferentes para coordenadas diferentes', () => {
            mockCacheService.get.and.returnValue(null);

            // Primeira localização
            service.buscarPrevisaoTempo(-23.5505, -46.6333, 'São Paulo').subscribe();
            let req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(mockOpenWeatherResponse);

            // Segunda localização
            service.buscarPrevisaoTempo(-22.9068, -43.1729, 'Rio de Janeiro').subscribe();
            req = httpMock.expectOne(request => request.url.includes('/weather'));
            req.flush(mockOpenWeatherResponse);

            expect(mockCacheService.get).toHaveBeenCalledWith('previsao_-23.5505_-46.6333');
            expect(mockCacheService.get).toHaveBeenCalledWith('previsao_-22.9068_-43.1729');
        });

        it('deve usar cache para previsão estendida', (done) => {
            const previsoesCacheadas = [mockPrevisaoTempo, mockPrevisaoTempo];
            mockCacheService.get.and.returnValue(previsoesCacheadas);

            service.buscarPrevisaoEstendida(-23.5505, -46.6333).subscribe(previsoes => {
                expect(previsoes).toEqual(previsoesCacheadas);
                expect(mockCacheService.get).toHaveBeenCalledWith('previsao_estendida_-23.5505_-46.6333');
                done();
            });

            // Não deve fazer requisição HTTP
            httpMock.expectNone(request => request.url.includes('/forecast'));
        });
    });
});