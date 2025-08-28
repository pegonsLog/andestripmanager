/**
 * Testes de Integração - DiasViagemService
 * 
 * Testa a integração do DiasViagemService com Firestore,
 * incluindo operações CRUD, manipulação de fotos e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { DiasViagemService } from './dias-viagem.service';
import { DiaViagem } from '../models';
import { MockDataFactory } from '../testing/test-utils';

describe('DiasViagemService - Testes de Integração', () => {
    let service: DiasViagemService;
    let mockFirestore: any;

    const mockDiaViagem: DiaViagem = MockDataFactory.createDiaViagem();
    const mockDiasViagem: DiaViagem[] = [
        { ...MockDataFactory.createDiaViagem(), numeroDia: 1, id: 'dia-1' },
        { ...MockDataFactory.createDiaViagem(), numeroDia: 2, id: 'dia-2' },
        { ...MockDataFactory.createDiaViagem(), numeroDia: 3, id: 'dia-3' }
    ];

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-dia-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockDiaViagem.id,
                data: () => mockDiaViagem
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: mockDiasViagem.map(d => ({
                    id: d.id,
                    data: () => d
                }))
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({})
        };

        TestBed.configureTestingModule({
            providers: [
                DiasViagemService,
                { provide: Firestore, useValue: mockFirestore }
            ]
        });

        service = TestBed.inject(DiasViagemService);
    });

    describe('Integração com Firestore - Consultas', () => {
        it('deve listar dias de viagem ordenados por número do dia', (done) => {
            const viagemId = 'viagem-123';

            service.listarDiasViagem(viagemId).subscribe(dias => {
                expect(dias).toEqual(mockDiasViagem);
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('numeroDia', 'asc');
                done();
            });
        });

        it('deve obter dia específico por número', (done) => {
            const viagemId = 'viagem-123';
            const numeroDia = 2;

            service.obterDiaPorNumero(viagemId, numeroDia).subscribe(dias => {
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.where).toHaveBeenCalledWith('numeroDia', '==', numeroDia);
                done();
            });
        });

        it('deve tratar erro durante listagem de dias', (done) => {
            const erro = new Error('Firestore error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            service.listarDiasViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar dias-viagem');
                    done();
                }
            });
        });
    });

    describe('Operações CRUD', () => {
        it('deve criar novo dia de viagem', async () => {
            const dadosDia = {
                viagemId: 'viagem-123',
                numeroDia: 1,
                data: '2024-06-01',
                cidadeOrigem: 'São Paulo',
                cidadeDestino: 'Rio de Janeiro',
                distanciaPlanejada: 430,
                horaPartidaPlanejada: '08:00',
                horaChegadaPlanejada: '14:00'
            };

            const diaId = await service.criarDiaViagem(dadosDia);

            expect(diaId).toBe('new-dia-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.viagemId).toBe(dadosDia.viagemId);
            expect(dadosPassados.numeroDia).toBe(dadosDia.numeroDia);
            expect(dadosPassados.cidadeOrigem).toBe(dadosDia.cidadeOrigem);
            expect(dadosPassados.cidadeDestino).toBe(dadosDia.cidadeDestino);
        });

        it('deve tratar erro durante criação', async () => {
            const erro = new Error('Firestore create error');
            mockFirestore.addDoc.and.returnValue(Promise.reject(erro));

            const dadosDia = {
                viagemId: 'viagem-123',
                numeroDia: 1,
                data: '2024-06-01',
                cidadeOrigem: 'São Paulo',
                cidadeDestino: 'Rio de Janeiro'
            };

            await expectAsync(service.criarDiaViagem(dadosDia))
                .toBeRejectedWithError('Erro ao criar dias-viagem');
        });
    });

    describe('Atualizações Específicas', () => {
        it('deve atualizar distância percorrida', async () => {
            const novaDistancia = 450;

            await service.atualizarDistanciaPercorrida(mockDiaViagem.id!, novaDistancia);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ distanciaPercorrida: novaDistancia });
        });

        it('deve atualizar horários reais - apenas partida', async () => {
            const horaPartida = '08:30';

            await service.atualizarHorariosReais(mockDiaViagem.id!, horaPartida);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ horaPartidaReal: horaPartida });
        });

        it('deve atualizar horários reais - apenas chegada', async () => {
            const horaChegada = '15:45';

            await service.atualizarHorariosReais(mockDiaViagem.id!, undefined, horaChegada);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ horaChegadaReal: horaChegada });
        });

        it('deve atualizar ambos os horários reais', async () => {
            const horaPartida = '08:30';
            const horaChegada = '15:45';

            await service.atualizarHorariosReais(mockDiaViagem.id!, horaPartida, horaChegada);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({
                horaPartidaReal: horaPartida,
                horaChegadaReal: horaChegada
            });
        });

        it('deve tratar erro durante atualização de horários', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.atualizarHorariosReais(mockDiaViagem.id!, '08:00'))
                .toBeRejectedWithError('Erro ao atualizar dias-viagem');
        });
    });

    describe('Gerenciamento de Fotos', () => {
        beforeEach(() => {
            // Mock para recuperar dia com fotos existentes
            const diaComFotos = {
                ...mockDiaViagem,
                fotos: ['foto1.jpg', 'foto2.jpg']
            };

            spyOn(service, 'recuperarPorId').and.returnValue(of(diaComFotos));
        });

        it('deve adicionar foto ao dia', async () => {
            const novaFoto = 'foto3.jpg';

            await service.adicionarFoto(mockDiaViagem.id!, novaFoto);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['foto1.jpg', 'foto2.jpg', 'foto3.jpg']);
        });

        it('deve adicionar primeira foto quando não há fotos', async () => {
            const diaSemFotos = { ...mockDiaViagem, fotos: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(diaSemFotos));

            const novaFoto = 'primeira-foto.jpg';

            await service.adicionarFoto(mockDiaViagem.id!, novaFoto);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['primeira-foto.jpg']);
        });

        it('deve remover foto específica do dia', async () => {
            const fotoParaRemover = 'foto1.jpg';

            await service.removerFoto(mockDiaViagem.id!, fotoParaRemover);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['foto2.jpg']);
        });

        it('deve manter fotos inalteradas se foto não existir', async () => {
            const fotoInexistente = 'foto-inexistente.jpg';

            await service.removerFoto(mockDiaViagem.id!, fotoInexistente);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['foto1.jpg', 'foto2.jpg']);
        });

        it('deve tratar caso onde dia não tem fotos para remover', async () => {
            const diaSemFotos = { ...mockDiaViagem, fotos: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(diaSemFotos));

            await service.removerFoto(mockDiaViagem.id!, 'qualquer-foto.jpg');

            // Não deve chamar updateDoc se não há fotos
            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve tratar erro ao recuperar dia para manipular fotos', async () => {
            spyOn(service, 'recuperarPorId').and.returnValue(throwError(() => new Error('Dia não encontrado')));

            // Não deve lançar erro, apenas não fazer nada
            await expectAsync(service.adicionarFoto(mockDiaViagem.id!, 'foto.jpg'))
                .toBeResolved();

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });
    });

    describe('Condições Climáticas', () => {
        it('deve atualizar condição climática', async () => {
            const condicao = 'Ensolarado';

            await service.atualizarClima(mockDiaViagem.id!, condicao);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ condicaoClimatica: condicao });
        });

        it('deve atualizar clima com temperaturas', async () => {
            const condicao = 'Parcialmente nublado';
            const tempMin = 18;
            const tempMax = 28;

            await service.atualizarClima(mockDiaViagem.id!, condicao, tempMin, tempMax);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({
                condicaoClimatica: condicao,
                temperaturaMin: tempMin,
                temperaturaMax: tempMax
            });
        });

        it('deve atualizar clima apenas com temperatura mínima', async () => {
            const condicao = 'Frio';
            const tempMin = 5;

            await service.atualizarClima(mockDiaViagem.id!, condicao, tempMin);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({
                condicaoClimatica: condicao,
                temperaturaMin: tempMin
            });
        });

        it('deve atualizar clima apenas com temperatura máxima', async () => {
            const condicao = 'Quente';
            const tempMax = 35;

            await service.atualizarClima(mockDiaViagem.id!, condicao, undefined, tempMax);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({
                condicaoClimatica: condicao,
                temperaturaMax: tempMax
            });
        });

        it('deve tratar erro durante atualização de clima', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.atualizarClima(mockDiaViagem.id!, 'Chuvoso'))
                .toBeRejectedWithError('Erro ao atualizar dias-viagem');
        });
    });

    describe('Tratamento de Erros Específicos do Firestore', () => {
        it('deve tratar erro de permissão negada', async () => {
            const erroPermissao = { code: 'permission-denied', message: 'Permission denied' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroPermissao));

            await expectAsync(service.criarDiaViagem({
                viagemId: 'viagem-123',
                numeroDia: 1,
                data: '2024-06-01',
                cidadeOrigem: 'São Paulo',
                cidadeDestino: 'Rio de Janeiro'
            })).toBeRejectedWithError('Erro ao criar dias-viagem');
        });

        it('deve tratar erro de rede', (done) => {
            const erroRede = { code: 'unavailable', message: 'Network error' };
            mockFirestore.getDocs.and.returnValue(Promise.reject(erroRede));

            service.listarDiasViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar dias-viagem');
                    done();
                }
            });
        });

        it('deve tratar erro de documento não encontrado', async () => {
            const erroNotFound = { code: 'not-found', message: 'Document not found' };
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erroNotFound));

            await expectAsync(service.atualizarDistanciaPercorrida('dia-inexistente', 100))
                .toBeRejectedWithError('Erro ao atualizar dias-viagem');
        });
    });

    describe('Validação de Dados', () => {
        it('deve preservar todos os campos ao criar dia', async () => {
            const dadosCompletos = {
                viagemId: 'viagem-123',
                numeroDia: 2,
                data: '2024-06-02',
                cidadeOrigem: 'Rio de Janeiro',
                cidadeDestino: 'Belo Horizonte',
                distanciaPlanejada: 440,
                horaPartidaPlanejada: '07:30',
                horaChegadaPlanejada: '13:30',
                observacoes: 'Parada para almoço em Juiz de Fora',
                coordenadasOrigem: { lat: -22.9068, lng: -43.1729 },
                coordenadasDestino: { lat: -19.9191, lng: -43.9386 }
            };

            await service.criarDiaViagem(dadosCompletos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(dadosCompletos.viagemId);
            expect(dadosPassados.numeroDia).toBe(dadosCompletos.numeroDia);
            expect(dadosPassados.data).toBe(dadosCompletos.data);
            expect(dadosPassados.cidadeOrigem).toBe(dadosCompletos.cidadeOrigem);
            expect(dadosPassados.cidadeDestino).toBe(dadosCompletos.cidadeDestino);
            expect(dadosPassados.distanciaPlanejada).toBe(dadosCompletos.distanciaPlanejada);
            expect(dadosPassados.horaPartidaPlanejada).toBe(dadosCompletos.horaPartidaPlanejada);
            expect(dadosPassados.horaChegadaPlanejada).toBe(dadosCompletos.horaChegadaPlanejada);
            expect(dadosPassados.observacoes).toBe(dadosCompletos.observacoes);
            expect(dadosPassados.coordenadasOrigem).toEqual(dadosCompletos.coordenadasOrigem);
            expect(dadosPassados.coordenadasDestino).toEqual(dadosCompletos.coordenadasDestino);
        });

        it('deve funcionar com campos opcionais ausentes', async () => {
            const dadosMinimos = {
                viagemId: 'viagem-123',
                numeroDia: 1,
                data: '2024-06-01',
                cidadeOrigem: 'São Paulo',
                cidadeDestino: 'Rio de Janeiro'
            };

            await service.criarDiaViagem(dadosMinimos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(dadosMinimos.viagemId);
            expect(dadosPassados.numeroDia).toBe(dadosMinimos.numeroDia);
            expect(dadosPassados.data).toBe(dadosMinimos.data);
            expect(dadosPassados.cidadeOrigem).toBe(dadosMinimos.cidadeOrigem);
            expect(dadosPassados.cidadeDestino).toBe(dadosMinimos.cidadeDestino);
            expect(dadosPassados.distanciaPlanejada).toBeUndefined();
            expect(dadosPassados.observacoes).toBeUndefined();
        });
    });

    describe('Casos Extremos', () => {
        it('deve tratar dia sem ID ao manipular fotos', async () => {
            const diaSemId = { ...mockDiaViagem, id: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(diaSemId));

            await expectAsync(service.adicionarFoto('', 'foto.jpg'))
                .toBeResolved();

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve tratar array de fotos vazio', async () => {
            const diaComFotosVazias = { ...mockDiaViagem, fotos: [] };
            spyOn(service, 'recuperarPorId').and.returnValue(of(diaComFotosVazias));

            await service.adicionarFoto(mockDiaViagem.id!, 'primeira-foto.jpg');

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['primeira-foto.jpg']);
        });

        it('deve tratar temperaturas com valores extremos', async () => {
            const tempMin = -10;
            const tempMax = 50;

            await service.atualizarClima(mockDiaViagem.id!, 'Extremo', tempMin, tempMax);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].temperaturaMin).toBe(tempMin);
            expect(chamada.args[1].temperaturaMax).toBe(tempMax);
        });

        it('deve tratar distância zero', async () => {
            await service.atualizarDistanciaPercorrida(mockDiaViagem.id!, 0);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].distanciaPercorrida).toBe(0);
        });
    });

    describe('Performance e Otimização', () => {
        it('deve lidar com grande número de dias', (done) => {
            const muitosDias = Array.from({ length: 100 }, (_, i) => ({
                ...MockDataFactory.createDiaViagem(),
                id: `dia-${i}`,
                numeroDia: i + 1
            }));

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: muitosDias.map(d => ({
                    id: d.id,
                    data: () => d
                }))
            }));

            service.listarDiasViagem('viagem-longa').subscribe(dias => {
                expect(dias.length).toBe(100);
                expect(dias[0].numeroDia).toBe(1);
                expect(dias[99].numeroDia).toBe(100);
                done();
            });
        });

        it('deve lidar com muitas fotos por dia', async () => {
            const muitasFotos = Array.from({ length: 50 }, (_, i) => `foto-${i}.jpg`);
            const diaComMuitasFotos = { ...mockDiaViagem, fotos: muitasFotos };
            spyOn(service, 'recuperarPorId').and.returnValue(of(diaComMuitasFotos));

            await service.adicionarFoto(mockDiaViagem.id!, 'nova-foto.jpg');

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos.length).toBe(51);
            expect(chamada.args[1].fotos[50]).toBe('nova-foto.jpg');
        });
    });
});