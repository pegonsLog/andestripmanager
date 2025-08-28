/**
 * Testes de Integração - HospedagensService
 * 
 * Testa a integração do HospedagensService com Firestore,
 * incluindo operações CRUD, cálculos automáticos e tratamento de erros.
 */

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

import { HospedagensService } from './hospedagens.service';
import { Hospedagem, TipoHospedagem } from '../models';
import { MockDataFactory } from '../testing/test-utils';

describe('HospedagensService - Testes de Integração', () => {
    let service: HospedagensService;
    let mockFirestore: any;

    const mockHospedagem: Hospedagem = MockDataFactory.createHospedagem();
    const mockHospedagens: Hospedagem[] = [
        { ...MockDataFactory.createHospedagem(), tipo: TipoHospedagem.HOTEL, valorDiaria: 150, id: 'hosp-1' },
        { ...MockDataFactory.createHospedagem(), tipo: TipoHospedagem.POUSADA, valorDiaria: 80, id: 'hosp-2' },
        { ...MockDataFactory.createHospedagem(), tipo: TipoHospedagem.CAMPING, valorDiaria: 30, id: 'hosp-3' }
    ];

    beforeEach(() => {
        // Mock do Firestore
        mockFirestore = {
            collection: jasmine.createSpy('collection').and.returnValue({}),
            doc: jasmine.createSpy('doc').and.returnValue({}),
            addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'new-hospedagem-id' })),
            updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
            deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
            getDoc: jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
                exists: () => true,
                id: mockHospedagem.id,
                data: () => mockHospedagem
            })),
            getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
                docs: mockHospedagens.map(h => ({
                    id: h.id,
                    data: () => h
                }))
            })),
            query: jasmine.createSpy('query').and.returnValue({}),
            where: jasmine.createSpy('where').and.returnValue({}),
            orderBy: jasmine.createSpy('orderBy').and.returnValue({})
        };

        TestBed.configureTestingModule({
            providers: [
                HospedagensService,
                { provide: Firestore, useValue: mockFirestore }
            ]
        });

        service = TestBed.inject(HospedagensService);
    });

    describe('Integração com Firestore - Consultas', () => {
        it('deve listar hospedagens de uma viagem ordenadas por data de check-in', (done) => {
            const viagemId = 'viagem-123';

            service.listarHospedagensViagem(viagemId).subscribe(hospedagens => {
                expect(hospedagens).toEqual(mockHospedagens);
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('dataCheckIn', 'asc');
                done();
            });
        });

        it('deve listar hospedagens por tipo', (done) => {
            const viagemId = 'viagem-123';
            const tipo = TipoHospedagem.HOTEL;

            service.listarPorTipo(viagemId, tipo).subscribe(hospedagens => {
                expect(mockFirestore.where).toHaveBeenCalledWith('viagemId', '==', viagemId);
                expect(mockFirestore.where).toHaveBeenCalledWith('tipo', '==', tipo);
                expect(mockFirestore.orderBy).toHaveBeenCalledWith('dataCheckIn', 'asc');
                done();
            });
        });

        it('deve tratar erro durante listagem de hospedagens', (done) => {
            const erro = new Error('Firestore error');
            mockFirestore.getDocs.and.returnValue(Promise.reject(erro));

            service.listarHospedagensViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar hospedagens');
                    done();
                }
            });
        });
    });

    describe('Criação com Cálculos Automáticos', () => {
        it('deve calcular número de noites e valor total automaticamente', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.HOTEL,
                nome: 'Hotel Copacabana',
                endereco: 'Av. Atlântica, 1702 - Rio de Janeiro, RJ',
                coordenadas: { lat: -22.9711, lng: -43.1822 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-03', // 2 noites
                valorDiaria: 200
            };

            const hospedagemId = await service.criarHospedagem(dadosHospedagem);

            expect(hospedagemId).toBe('new-hospedagem-id');
            expect(mockFirestore.addDoc).toHaveBeenCalled();

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroNoites).toBe(2);
            expect(dadosPassados.valorTotal).toBe(400); // 2 noites × R$ 200
        });

        it('deve calcular corretamente para uma noite', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.POUSADA,
                nome: 'Pousada do Vale',
                endereco: 'Campos do Jordão, SP',
                coordenadas: { lat: -22.7390, lng: -45.5910 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-02', // 1 noite
                valorDiaria: 120
            };

            await service.criarHospedagem(dadosHospedagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroNoites).toBe(1);
            expect(dadosPassados.valorTotal).toBe(120);
        });

        it('deve calcular corretamente para múltiplas noites', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.HOTEL,
                nome: 'Resort Bahia',
                endereco: 'Porto Seguro, BA',
                coordenadas: { lat: -16.4477, lng: -39.0639 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-08', // 7 noites
                valorDiaria: 300
            };

            await service.criarHospedagem(dadosHospedagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroNoites).toBe(7);
            expect(dadosPassados.valorTotal).toBe(2100); // 7 noites × R$ 300
        });

        it('deve tratar datas iguais (check-in e check-out no mesmo dia)', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.MOTEL,
                nome: 'Motel Rápido',
                endereco: 'São Paulo, SP',
                coordenadas: { lat: -23.5505, lng: -46.6333 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-01', // Mesmo dia
                valorDiaria: 80
            };

            await service.criarHospedagem(dadosHospedagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroNoites).toBe(1); // Mínimo de 1 noite
            expect(dadosPassados.valorTotal).toBe(80);
        });

        it('deve tratar erro durante criação', async () => {
            const erro = new Error('Firestore create error');
            mockFirestore.addDoc.and.returnValue(Promise.reject(erro));

            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.HOTEL,
                nome: 'Erro',
                endereco: 'Teste',
                coordenadas: { lat: 0, lng: 0 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-02',
                valorDiaria: 100
            };

            await expectAsync(service.criarHospedagem(dadosHospedagem))
                .toBeRejectedWithError('Erro ao criar hospedagens');
        });
    });

    describe('Sistema de Avaliação', () => {
        it('deve atualizar avaliação válida (1-5)', async () => {
            const avaliacao = 4;

            await service.atualizarAvaliacao(mockHospedagem.id!, avaliacao);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1]).toEqual({ avaliacao });
        });

        it('deve aceitar avaliação mínima (1)', async () => {
            await service.atualizarAvaliacao(mockHospedagem.id!, 1);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].avaliacao).toBe(1);
        });

        it('deve aceitar avaliação máxima (5)', async () => {
            await service.atualizarAvaliacao(mockHospedagem.id!, 5);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].avaliacao).toBe(5);
        });

        it('deve rejeitar avaliação menor que 1', async () => {
            await expectAsync(service.atualizarAvaliacao(mockHospedagem.id!, 0))
                .toBeRejectedWithError('Avaliação deve ser entre 1 e 5');

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve rejeitar avaliação maior que 5', async () => {
            await expectAsync(service.atualizarAvaliacao(mockHospedagem.id!, 6))
                .toBeRejectedWithError('Avaliação deve ser entre 1 e 5');

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve tratar erro durante atualização de avaliação', async () => {
            const erro = new Error('Firestore update error');
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erro));

            await expectAsync(service.atualizarAvaliacao(mockHospedagem.id!, 4))
                .toBeRejectedWithError('Erro ao atualizar hospedagens');
        });
    });

    describe('Gerenciamento de Comodidades', () => {
        beforeEach(() => {
            // Mock para recuperar hospedagem com comodidades existentes
            const hospedagemComComodidades = {
                ...mockHospedagem,
                comodidades: ['Wi-Fi', 'Ar Condicionado']
            };

            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemComComodidades));
        });

        it('deve adicionar nova comodidade', async () => {
            const novaComodidade = 'Piscina';

            await service.adicionarComodidade(mockHospedagem.id!, novaComodidade);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].comodidades).toEqual(['Wi-Fi', 'Ar Condicionado', 'Piscina']);
        });

        it('deve não adicionar comodidade duplicada', async () => {
            const comodidadeExistente = 'Wi-Fi';

            await service.adicionarComodidade(mockHospedagem.id!, comodidadeExistente);

            // Não deve chamar updateDoc se comodidade já existe
            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve adicionar primeira comodidade quando não há comodidades', async () => {
            const hospedagemSemComodidades = { ...mockHospedagem, comodidades: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemSemComodidades));

            const novaComodidade = 'Estacionamento';

            await service.adicionarComodidade(mockHospedagem.id!, novaComodidade);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].comodidades).toEqual(['Estacionamento']);
        });

        it('deve remover comodidade específica', async () => {
            const comodidadeParaRemover = 'Wi-Fi';

            await service.removerComodidade(mockHospedagem.id!, comodidadeParaRemover);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].comodidades).toEqual(['Ar Condicionado']);
        });

        it('deve manter comodidades inalteradas se comodidade não existir', async () => {
            const comodidadeInexistente = 'Sauna';

            await service.removerComodidade(mockHospedagem.id!, comodidadeInexistente);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].comodidades).toEqual(['Wi-Fi', 'Ar Condicionado']);
        });

        it('deve tratar caso onde hospedagem não tem comodidades para remover', async () => {
            const hospedagemSemComodidades = { ...mockHospedagem, comodidades: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemSemComodidades));

            await service.removerComodidade(mockHospedagem.id!, 'Qualquer');

            // Não deve chamar updateDoc se não há comodidades
            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });

        it('deve tratar erro ao recuperar hospedagem para manipular comodidades', async () => {
            spyOn(service, 'recuperarPorId').and.returnValue(throwError(() => new Error('Hospedagem não encontrada')));

            // Não deve lançar erro, apenas não fazer nada
            await expectAsync(service.adicionarComodidade(mockHospedagem.id!, 'Comodidade'))
                .toBeResolved();

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });
    });

    describe('Gerenciamento de Fotos', () => {
        beforeEach(() => {
            // Mock para recuperar hospedagem com fotos existentes
            const hospedagemComFotos = {
                ...mockHospedagem,
                fotos: ['foto1.jpg', 'foto2.jpg']
            };

            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemComFotos));
        });

        it('deve adicionar foto à hospedagem', async () => {
            const novaFoto = 'foto3.jpg';

            await service.adicionarFoto(mockHospedagem.id!, novaFoto);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['foto1.jpg', 'foto2.jpg', 'foto3.jpg']);
        });

        it('deve adicionar primeira foto quando não há fotos', async () => {
            const hospedagemSemFotos = { ...mockHospedagem, fotos: undefined };
            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemSemFotos));

            const novaFoto = 'primeira-foto.jpg';

            await service.adicionarFoto(mockHospedagem.id!, novaFoto);

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].fotos).toEqual(['primeira-foto.jpg']);
        });

        it('deve tratar erro ao recuperar hospedagem para adicionar foto', async () => {
            spyOn(service, 'recuperarPorId').and.returnValue(throwError(() => new Error('Hospedagem não encontrada')));

            // Não deve lançar erro, apenas não fazer nada
            await expectAsync(service.adicionarFoto(mockHospedagem.id!, 'foto.jpg'))
                .toBeResolved();

            expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
        });
    });

    describe('Cálculo de Custo Total', () => {
        beforeEach(() => {
            spyOn(service, 'listarHospedagensViagem').and.returnValue(of(mockHospedagens));
        });

        it('deve calcular custo total de todas as hospedagens da viagem', async () => {
            // Configurar valores totais para as hospedagens mock
            mockHospedagens[0].valorTotal = 300; // Hotel
            mockHospedagens[1].valorTotal = 160; // Pousada
            mockHospedagens[2].valorTotal = 60;  // Camping

            const custoTotal = await service.calcularCustoTotal('viagem-123');

            expect(custoTotal).toBe(520); // 300 + 160 + 60
        });

        it('deve retornar zero para viagem sem hospedagens', async () => {
            spyOn(service, 'listarHospedagensViagem').and.returnValue(of([]));

            const custoTotal = await service.calcularCustoTotal('viagem-vazia');

            expect(custoTotal).toBe(0);
        });

        it('deve retornar zero se não conseguir carregar hospedagens', async () => {
            spyOn(service, 'listarHospedagensViagem').and.returnValue(of(undefined as any));

            const custoTotal = await service.calcularCustoTotal('viagem-123');

            expect(custoTotal).toBe(0);
        });

        it('deve tratar hospedagens com valor total undefined', async () => {
            const hospedagensSemValor = [
                { ...mockHospedagens[0], valorTotal: undefined as any },
                { ...mockHospedagens[1], valorTotal: 200 }
            ];

            spyOn(service, 'listarHospedagensViagem').and.returnValue(of(hospedagensSemValor));

            const custoTotal = await service.calcularCustoTotal('viagem-123');

            expect(custoTotal).toBe(200); // Apenas a segunda hospedagem
        });
    });

    describe('Tratamento de Erros Específicos do Firestore', () => {
        it('deve tratar erro de permissão negada', async () => {
            const erroPermissao = { code: 'permission-denied', message: 'Permission denied' };
            mockFirestore.addDoc.and.returnValue(Promise.reject(erroPermissao));

            await expectAsync(service.criarHospedagem({
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.HOTEL,
                nome: 'Sem permissão',
                endereco: 'Teste',
                coordenadas: { lat: 0, lng: 0 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-02',
                valorDiaria: 100
            })).toBeRejectedWithError('Erro ao criar hospedagens');
        });

        it('deve tratar erro de rede', (done) => {
            const erroRede = { code: 'unavailable', message: 'Network error' };
            mockFirestore.getDocs.and.returnValue(Promise.reject(erroRede));

            service.listarHospedagensViagem('viagem-123').subscribe({
                next: () => fail('Não deveria ter sucesso'),
                error: (err) => {
                    expect(err.message).toContain('Erro ao listar hospedagens');
                    done();
                }
            });
        });

        it('deve tratar erro de documento não encontrado', async () => {
            const erroNotFound = { code: 'not-found', message: 'Document not found' };
            mockFirestore.updateDoc.and.returnValue(Promise.reject(erroNotFound));

            await expectAsync(service.atualizarAvaliacao('hospedagem-inexistente', 4))
                .toBeRejectedWithError('Erro ao atualizar hospedagens');
        });
    });

    describe('Validação de Dados', () => {
        it('deve preservar todos os campos ao criar hospedagem', async () => {
            const dadosCompletos = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.HOTEL,
                nome: 'Hotel Luxo',
                endereco: 'Av. Beira Mar, 500 - Fortaleza, CE',
                coordenadas: { lat: -3.7319, lng: -38.5267 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-04',
                valorDiaria: 250,
                telefone: '(85) 3333-4444',
                email: 'contato@hotelluxo.com',
                site: 'https://hotelluxo.com',
                observacoes: 'Hotel com vista para o mar',
                comodidades: ['Wi-Fi', 'Piscina', 'Academia'],
                estacionamentoCoberto: true,
                permiteAnimais: false
            };

            await service.criarHospedagem(dadosCompletos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(dadosCompletos.viagemId);
            expect(dadosPassados.diaViagemId).toBe(dadosCompletos.diaViagemId);
            expect(dadosPassados.tipo).toBe(dadosCompletos.tipo);
            expect(dadosPassados.nome).toBe(dadosCompletos.nome);
            expect(dadosPassados.endereco).toBe(dadosCompletos.endereco);
            expect(dadosPassados.coordenadas).toEqual(dadosCompletos.coordenadas);
            expect(dadosPassados.dataCheckIn).toBe(dadosCompletos.dataCheckIn);
            expect(dadosPassados.dataCheckOut).toBe(dadosCompletos.dataCheckOut);
            expect(dadosPassados.valorDiaria).toBe(dadosCompletos.valorDiaria);
            expect(dadosPassados.telefone).toBe(dadosCompletos.telefone);
            expect(dadosPassados.email).toBe(dadosCompletos.email);
            expect(dadosPassados.site).toBe(dadosCompletos.site);
            expect(dadosPassados.observacoes).toBe(dadosCompletos.observacoes);
            expect(dadosPassados.comodidades).toEqual(dadosCompletos.comodidades);
            expect(dadosPassados.estacionamentoCoberto).toBe(dadosCompletos.estacionamentoCoberto);
            expect(dadosPassados.permiteAnimais).toBe(dadosCompletos.permiteAnimais);
            expect(dadosPassados.numeroNoites).toBe(3); // 4 - 1 = 3 noites
            expect(dadosPassados.valorTotal).toBe(750); // 3 × 250
        });

        it('deve funcionar com campos opcionais ausentes', async () => {
            const dadosMinimos = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.CAMPING,
                nome: 'Camping Natureza',
                endereco: 'Serra da Mantiqueira',
                coordenadas: { lat: -22.4, lng: -45.4 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-02',
                valorDiaria: 25
            };

            await service.criarHospedagem(dadosMinimos);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];

            expect(dadosPassados.viagemId).toBe(dadosMinimos.viagemId);
            expect(dadosPassados.tipo).toBe(dadosMinimos.tipo);
            expect(dadosPassados.nome).toBe(dadosMinimos.nome);
            expect(dadosPassados.valorDiaria).toBe(dadosMinimos.valorDiaria);
            expect(dadosPassados.numeroNoites).toBe(1);
            expect(dadosPassados.valorTotal).toBe(25);
            expect(dadosPassados.telefone).toBeUndefined();
            expect(dadosPassados.email).toBeUndefined();
            expect(dadosPassados.observacoes).toBeUndefined();
        });
    });

    describe('Casos Extremos', () => {
        it('deve tratar valores de diária muito altos', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.RESORT,
                nome: 'Resort Luxo Extremo',
                endereco: 'Ilha Privada',
                coordenadas: { lat: -23.5, lng: -45.5 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-02',
                valorDiaria: 5000 // Valor muito alto
            };

            await service.criarHospedagem(dadosHospedagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.valorTotal).toBe(5000);
        });

        it('deve tratar estadia muito longa', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.APARTAMENTO,
                nome: 'Apartamento Temporada',
                endereco: 'Gramado, RS',
                coordenadas: { lat: -29.3788, lng: -50.8740 },
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-07-01', // 30 noites
                valorDiaria: 150
            };

            await service.criarHospedagem(dadosHospedagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.numeroNoites).toBe(30);
            expect(dadosPassados.valorTotal).toBe(4500); // 30 × 150
        });

        it('deve tratar array de comodidades vazio', async () => {
            const hospedagemComComodidadesVazias = { ...mockHospedagem, comodidades: [] };
            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemComComodidadesVazias));

            await service.adicionarComodidade(mockHospedagem.id!, 'Primeira comodidade');

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].comodidades).toEqual(['Primeira comodidade']);
        });

        it('deve tratar coordenadas com valores extremos', async () => {
            const dadosHospedagem = {
                viagemId: 'viagem-123',
                diaViagemId: 'dia-123',
                tipo: TipoHospedagem.POUSADA,
                nome: 'Pousada Extremo Sul',
                endereco: 'Antártica',
                coordenadas: { lat: -90, lng: -180 }, // Valores extremos válidos
                dataCheckIn: '2024-06-01',
                dataCheckOut: '2024-06-02',
                valorDiaria: 1000
            };

            await service.criarHospedagem(dadosHospedagem);

            const chamada = mockFirestore.addDoc.calls.mostRecent();
            const dadosPassados = chamada.args[1];
            expect(dadosPassados.coordenadas).toEqual({ lat: -90, lng: -180 });
        });
    });

    describe('Performance e Otimização', () => {
        it('deve lidar com grande número de hospedagens', (done) => {
            const muitasHospedagens = Array.from({ length: 50 }, (_, i) => ({
                ...MockDataFactory.createHospedagem(),
                id: `hospedagem-${i}`,
                valorTotal: (i + 1) * 100
            }));

            mockFirestore.getDocs.and.returnValue(Promise.resolve({
                docs: muitasHospedagens.map(h => ({
                    id: h.id,
                    data: () => h
                }))
            }));

            service.listarHospedagensViagem('viagem-longa').subscribe(hospedagens => {
                expect(hospedagens.length).toBe(50);
                done();
            });
        });

        it('deve calcular custo total eficientemente com muitas hospedagens', async () => {
            const muitasHospedagens = Array.from({ length: 100 }, (_, i) => ({
                ...MockDataFactory.createHospedagem(),
                valorTotal: 100
            }));

            spyOn(service, 'listarHospedagensViagem').and.returnValue(of(muitasHospedagens));

            const custoTotal = await service.calcularCustoTotal('viagem-123');

            expect(custoTotal).toBe(10000); // 100 × 100
        });

        it('deve lidar com muitas comodidades por hospedagem', async () => {
            const muitasComodidades = Array.from({ length: 20 }, (_, i) => `Comodidade ${i}`);
            const hospedagemComMuitasComodidades = { ...mockHospedagem, comodidades: muitasComodidades };
            spyOn(service, 'recuperarPorId').and.returnValue(of(hospedagemComMuitasComodidades));

            await service.adicionarComodidade(mockHospedagem.id!, 'Nova comodidade');

            expect(mockFirestore.updateDoc).toHaveBeenCalled();
            const chamada = mockFirestore.updateDoc.calls.mostRecent();
            expect(chamada.args[1].comodidades.length).toBe(21);
            expect(chamada.args[1].comodidades[20]).toBe('Nova comodidade');
        });
    });
});