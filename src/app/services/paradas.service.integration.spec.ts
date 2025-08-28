/**
 * Testes de Integração - ParadasService
 * 
 * Testa a integração do ParadasService com Firestore,
 * incluindo operações CRUD, cálculos e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { ParadasService } from './paradas.service';
import { Parada, TipoParada } from '../models';
import { MockDataFactory } from '../testing/test-utils';

describe('ParadasService - Testes de Integração', () => {
    let service: ParadasService;
    let mockFirestore: any;

    const mockParada: Parada = MockDataFactory.createParada();
    const mockParadas: Parada[] = [
        { ...MockDataFactory.createParada(), tipo: TipoParada.ABASTECIMENTO, id: 'parada-1' },
        { ...MockDataFactory.createParada(), tipo: TipoParada.REFEICAO, id: 'parada-2' },
        { ...MockDataFactory.createParada(), tipo: TipoParada.PONTO_INTERESSE, id: 'parada-3' },
        { ...MockDataFactory.createParada(), tipo: TipoParada.ABASTECIMENTO, id: 'parada-4' }
    ];

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-parada-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockParada.id,
                data: () => mockParada
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: mockParadas.map(p => ({
                    id: p.id,
                    data: () => p
                }))
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({})
        };

        TestBed.configureTestingModule({
            providers: [
                ParadasService,
                { provide: Firestore, useValue: mockFirestore }
            ]
        });

        service = TestBed.inject(ParadasService);
    });

    describe('Integração com Firestore - Consultas', () => {
        it('deve listar paradas de um dia ordenadas por hora de chegada', (done) => {
            const diaViagemId = 'dia-123';

            service.listarParadasDia(diaViagemId).subscribe(paradas => {
                expect(paradas).toEqual(mockParadas);
                expect(mockFirestore.where).toHaveBeenCalledWith('diaViagemId', '==', diaViagemId);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('horaChegada', 'asc');
                done();
            });
        });

        it('deve listar paradas de uma viagem', (done) => {
            const viagemId = 'viagem-123';

            service.listarParadasViagem(viagemId).subscribe(paradas => {
                expect(paradas).toEqual(mockParadas);
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('horaChegada', 'asc');
                done();
            });
        });

        it('deve listar paradas por tipo', (done) => {
            const viagemId = 'viagem-123';
            const tipo = TipoParada.ABASTECIMENTO;

            service.listarPorTipo(viagemId, tipo).subscribe(paradas => {
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.where).toHaveBeenCalledWith('tipo', '==', tipo);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('horaChegada', 'asc');
                done();
            });
        });

        it('deve tratar erro durante listagem de paradas', (done) => {
            const erro = new Error('Firestore error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            service.listarParadasDia('dia-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar paradas');
                    done();
                }
            });
        });
    });

    describe('Criação de Paradas com Cálculos', () => {
        it('deve criar parada simples sem cálculo de duração', async () => {
            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.PONTO_INTERESSE,
                nome: 'Cristo Redentor',
                endereco: 'Rio de Janeiro, RJ',
                coordenadas: { lat: -22.9519, lng: -43.2105 },
                horaChegada: '10:00'
            };

            const paradaId = await service.criarParada(dadosParada);

            expect(paradaId).toBe('new-parada-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.tipo).toBe(TipoParada.PONTO_INTERESSE);
            expect(dadosPassados.nome).toBe('Cristo Redentor');
            expect(dadosPassados.duracao).toBeUndefined();
        });

        it('deve calcular duração quando há hora de chegada e saída', async () => {
            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.REFEICAO,
                nome: 'Restaurante do João',
                endereco: 'São Paulo, SP',
                coordenadas: { lat: -23.5505, lng: -46.6333 },
                horaChegada: '12:00',
                horaSaida: '13:30'
            };

            await service.criarParada(dadosParada);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.duracao).toBe(90); // 1h30min = 90 minutos
        });

        it('deve tratar duração negativa (saída antes da chegada)', async () => {
            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.ABASTECIMENTO,
                nome: 'Posto Shell',
                endereco: 'Belo Horizonte, MG',
                coordenadas: { lat: -19.9167, lng: -43.9345 },
                horaChegada: '15:00',
                horaSaida: '14:30' // Saída antes da chegada
            };

            await service.criarParada(dadosParada);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.duracao).toBeUndefined();
        });

        it('deve calcular duração corretamente com horários no mesmo dia', async () => {
            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.ABASTECIMENTO,
                nome: 'Posto BR',
                endereco: 'Campinas, SP',
                coordenadas: { lat: -22.9056, lng: -47.0608 },
                horaChegada: '08:15',
                horaSaida: '08:45'
            };

            await service.criarParada(dadosParada);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.duracao).toBe(30); // 30 minutos
        });

        it('deve tratar erro durante criação', async () => {
            const erro = new Error('Firestore create error');
            mockFirestore.addDoc.and.returnValue(Promise.reject(erro));

            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.REFEICAO,
                nome: 'Erro',
                endereco: 'Teste',
                coordenadas: { lat: 0, lng: 0 }
            };

            await expectAsync(service.criarParada(dadosParada))
                .toBeRejectedWithError('Erro ao criar paradas');
        });
    });

    describe('Gerenciamento de Fotos', () => {
        beforeEach(() => {
            // Mock para recuperar parada com fotos existentes
            const paradaComFotos = {
                ...mockParada,
                fotos: ['foto1.jpg', 'foto2.jpg']
            };

            spyOn(service, 'recuperarPorId').and.returnValue(of(paradaComFotos));
        });

        it('deve adicionar foto à parada', async () => {
            const novaFoto = 'foto3.jpg';

            await service.adicionarFoto(mockParada.id!, novaFoto);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['foto1.jpg', 'foto2.jpg', 'foto3.jpg']);
        });

        it('deve adicionar primeira foto quando não há fotos', async () => {
            const paradaSemFotos = { ...mockParada, fotos: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(paradaSemFotos));

            const novaFoto = 'primeira-foto.jpg';

            await service.adicionarFoto(mockParada.id!, novaFoto);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['primeira-foto.jpg']);
        });

        it('deve tratar erro ao recuperar parada para adicionar foto', async () => {
            spyOn(service, 'recuperarPorId').and.returnValue(throwError(() => new Error('Parada não encontrada')));

            // Não deve lançar erro, apenas não fazer nada
            await expectAsync(service.adicionarFoto(mockParada.id!, 'foto.jpg'))
                .toBeResolved();

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve tratar parada inexistente ao adicionar foto', async () => {
            spyOn(service, 'recuperarPorId').and.returnValue(of(undefined));

            await expectAsync(service.adicionarFoto('parada-inexistente', 'foto.jpg'))
                .toBeResolved();

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });
    });

    describe('Sistema de Avaliação', () => {
        it('deve atualizar avaliação válida (1-5)', async () => {
            const avaliacao = 4;

            await service.atualizarAvaliacao(mockParada.id!, avaliacao);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ avaliacao });
        });

        it('deve aceitar avaliação mínima (1)', async () => {
            await service.atualizarAvaliacao(mockParada.id!, 1);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].avaliacao).toBe(1);
        });

        it('deve aceitar avaliação máxima (5)', async () => {
            await service.atualizarAvaliacao(mockParada.id!, 5);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].avaliacao).toBe(5);
        });

        it('deve rejeitar avaliação menor que 1', async () => {
            await expectAsync(service.atualizarAvaliacao(mockParada.id!, 0))
                .toBeRejectedWithError('Avaliação deve ser entre 1 e 5');

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve rejeitar avaliação maior que 5', async () => {
            await expectAsync(service.atualizarAvaliacao(mockParada.id!, 6))
                .toBeRejectedWithError('Avaliação deve ser entre 1 e 5');

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve tratar erro durante atualização de avaliação', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.atualizarAvaliacao(mockParada.id!, 4))
                .toBeRejectedWithError('Erro ao atualizar paradas');
        });
    });

    describe('Estatísticas por Tipo', () => {
        beforeEach(() => {
            spyOn(service, 'listarParadasViagem').and.returnValue(of(mockParadas));
        });

        it('deve calcular estatísticas por tipo de parada', async () => {
            const estatisticas = await service.obterEstatisticasPorTipo('viagem-123');

            expect(estatisticas[TipoParada.ABASTECIMENTO]).toBe(2);
            expect(estatisticas[TipoParada.REFEICAO]).toBe(1);
            expect(estatisticas[TipoParada.PONTO_INTERESSE]).toBe(1);
        });

        it('deve retornar estatísticas vazias para viagem sem paradas', async () => {
            spyOn(service, 'listarParadasViagem').and.returnValue(of([]));

            const estatisticas = await service.obterEstatisticasPorTipo('viagem-vazia');

            expect(Object.keys(estatisticas).length).toBe(0);
        });

        it('deve tratar erro ao obter estatísticas', async () => {
            spyOn(service, 'listarParadasViagem').and.returnValue(throwError(() => new Error('Erro de rede')));

            const estatisticas = await service.obterEstatisticasPorTipo('viagem-123');

            expect(estatisticas).toEqual({});
        });

        it('deve contar corretamente tipos únicos', async () => {
            const paradasUnicas = [
                { ...MockDataFactory.createParada(), tipo: TipoParada.ABASTECIMENTO },
                { ...MockDataFactory.createParada(), tipo: TipoParada.REFEICAO },
                { ...MockDataFactory.createParada(), tipo: TipoParada.PONTO_INTERESSE }
            ];

            spyOn(service, 'listarParadasViagem').and.returnValue(of(paradasUnicas));

            const estatisticas = await service.obterEstatisticasPorTipo('viagem-123');

            expect(estatisticas[TipoParada.ABASTECIMENTO]).toBe(1);
            expect(estatisticas[TipoParada.REFEICAO]).toBe(1);
            expect(estatisticas[TipoParada.PONTO_INTERESSE]).toBe(1);
        });
    });

    describe('Tratamento de Erros Específicos do Firestore', () => {
        it('deve tratar erro de permissão negada', async () => {
            const erroPermissao = { code: 'permission-denied', message: 'Permission denied' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroPermissao));

            await expectAsync(service.criarParada({
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.ABASTECIMENTO,
                nome: 'Sem permissão',
                endereco: 'Teste',
                coordenadas: { lat: 0, lng: 0 }
            })).toBeRejectedWithError('Erro ao criar paradas');
        });

        it('deve tratar erro de rede', (done) => {
            const erroRede = { code: 'unavailable', message: 'Network error' };
            mockFirestore.getDocs.and.returnValue(Promise.reject(erroRede));

            service.listarParadasViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar paradas');
                    done();
                }
            });
        });

        it('deve tratar erro de documento não encontrado', async () => {
            const erroNotFound = { code: 'not-found', message: 'Document not found' };
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erroNotFound));

            await expectAsync(service.atualizarAvaliacao('parada-inexistente', 4))
                .toBeRejectedWithError('Erro ao atualizar paradas');
        });
    });

    describe('Validação de Dados', () => {
        it('deve preservar todos os campos ao criar parada', async () => {
            const dadosCompletos = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.ABASTECIMENTO,
                nome: 'Posto Ipiranga',
                endereco: 'Av. Paulista, 1000 - São Paulo, SP',
                coordenadas: { lat: -23.5613, lng: -46.6565 },
                horaChegada: '14:30',
                horaSaida: '14:45',
                observacoes: 'Posto com bom preço',
                dadosAbastecimento: {
                    combustivel: 'Gasolina Comum',
                    litros: 45,
                    precoLitro: 5.89,
                    valorTotal: 265.05
                }
            };

            await service.criarParada(dadosCompletos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.diaViagemId).toBe(dadosCompletos.diaViagemId);
            expect(dadosPassados.viagemId).toBe(dadosCompletos.viagemId);
            expect(dadosPassados.tipo).toBe(dadosCompletos.tipo);
            expect(dadosPassados.nome).toBe(dadosCompletos.nome);
            expect(dadosPassados.endereco).toBe(dadosCompletos.endereco);
            expect(dadosPassados.coordenadas).toEqual(dadosCompletos.coordenadas);
            expect(dadosPassados.horaChegada).toBe(dadosCompletos.horaChegada);
            expect(dadosPassados.horaSaida).toBe(dadosCompletos.horaSaida);
            expect(dadosPassados.observacoes).toBe(dadosCompletos.observacoes);
            expect(dadosPassados.dadosAbastecimento).toEqual(dadosCompletos.dadosAbastecimento);
            expect(dadosPassados.duracao).toBe(15); // 14:45 - 14:30 = 15 minutos
        });

        it('deve funcionar com campos opcionais ausentes', async () => {
            const dadosMinimos = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.PONTO_INTERESSE,
                nome: 'Mirante',
                endereco: 'Serra da Mantiqueira',
                coordenadas: { lat: -22.4, lng: -45.4 }
            };

            await service.criarParada(dadosMinimos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.diaViagemId).toBe(dadosMinimos.diaViagemId);
            expect(dadosPassados.viagemId).toBe(dadosMinimos.viagemId);
            expect(dadosPassados.tipo).toBe(dadosMinimos.tipo);
            expect(dadosPassados.nome).toBe(dadosMinimos.nome);
            expect(dadosPassados.endereco).toBe(dadosMinimos.endereco);
            expect(dadosPassados.coordenadas).toEqual(dadosMinimos.coordenadas);
            expect(dadosPassados.horaChegada).toBeUndefined();
            expect(dadosPassados.horaSaida).toBeUndefined();
            expect(dadosPassados.observacoes).toBeUndefined();
            expect(dadosPassados.duracao).toBeUndefined();
        });
    });

    describe('Casos Extremos', () => {
        it('deve tratar coordenadas com valores extremos', async () => {
            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.PONTO_INTERESSE,
                nome: 'Ponto Extremo',
                endereco: 'Localização remota',
                coordenadas: { lat: -90, lng: -180 } // Valores extremos válidos
            };

            await service.criarParada(dadosParada);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.coordenadas).toEqual({ lat: -90, lng: -180 });
        });

        it('deve tratar horários na virada do dia', async () => {
            const dadosParada = {
                diaViagemId: 'dia-123',
                viagemId: 'viagem-123',
                tipo: TipoParada.REFEICAO,
                nome: 'Lanchonete 24h',
                endereco: 'Rodovia BR-116',
                coordenadas: { lat: -23.5, lng: -46.6 },
                horaChegada: '23:45',
                horaSaida: '00:15' // Saída no dia seguinte
            };

            await service.criarParada(dadosParada);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            // Duração deve ser undefined pois o cálculo simples não trata virada de dia
            expect(dadosPassados.duracao).toBeUndefined();
        });

        it('deve tratar array de fotos vazio', async () => {
            const paradaComFotosVazias = { ...mockParada, fotos: [] };
            spyOn(service, 'recuperarPorId').and.returnValue(of(paradaComFotosVazias));

            await service.adicionarFoto(mockParada.id!, 'primeira-foto.jpg');

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['primeira-foto.jpg']);
        });
    });

    describe('Performance e Otimização', () => {
        it('deve lidar com grande número de paradas', (done) => {
            const muitasParadas = Array.from({ length: 200 }, (_, i) => ({
                ...MockDataFactory.createParada(),
                id: `parada-${i}`,
                tipo: Object.values(TipoParada)[i % Object.values(TipoParada).length]
            }));

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: muitasParadas.map(p => ({
                    id: p.id,
                    data: () => p
                }))
            }));

            service.listarParadasViagem('viagem-longa').subscribe(paradas => {
                expect(paradas.length).toBe(200);
                done();
            });
        });

        it('deve calcular estatísticas eficientemente com muitas paradas', async () => {
            const muitasParadas = Array.from({ length: 1000 }, (_, i) => ({
                ...MockDataFactory.createParada(),
                tipo: Object.values(TipoParada)[i % Object.values(TipoParada).length]
            }));

            spyOn(service, 'listarParadasViagem').and.returnValue(of(muitasParadas));

            const estatisticas = await service.obterEstatisticasPorTipo('viagem-123');

            const totalParadas = Object.values(estatisticas).reduce((sum, count) => sum + count, 0);
            expect(totalParadas).toBe(1000);
            expect(Object.keys(estatisticas).length).toBe(Object.values(TipoParada).length);
        });

        it('deve lidar com muitas fotos por parada', async () => {
            const muitasFotos = Array.from({ length: 100 }, (_, i) => `foto-${i}.jpg`);
            const paradaComMuitasFotos = { ...mockParada, fotos: muitasFotos };
            spyOn(service, 'recuperarPorId').and.returnValue(of(paradaComMuitasFotos));

            await service.adicionarFoto(mockParada.id!, 'nova-foto.jpg');

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos.length).toBe(101);
            expect(chamada.args[1].fotos[100]).toBe('nova-foto.jpg');
        });
    });
});