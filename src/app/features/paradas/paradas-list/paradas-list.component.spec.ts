import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ParadasListComponent } from './paradas-list.component';
import { Parada, TipoParada } from '../../../models';

describe('ParadasListComponent', () => {
    let component: ParadasListComponent;
    let fixture: ComponentFixture<ParadasListComponent>;

    const mockParada: Parada = {
        id: 'parada-123',
        diaViagemId: 'dia-123',
        viagemId: 'viagem-123',
        tipo: TipoParada.ABASTECIMENTO,
        nome: 'Posto Shell',
        endereco: 'Rua das Flores, 123',
        coordenadas: [-15.7942, -47.8822],
        horaChegada: '10:00',
        horaSaida: '10:30',
        custo: 150.50,
        observacoes: 'Posto com bom atendimento',
        fotos: ['foto1.jpg', 'foto2.jpg']
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                ParadasListComponent,
                NoopAnimationsModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ParadasListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar com valores padrão', () => {
        expect(component.paradas).toEqual([]);
        expect(component.showMap).toBe(true);
        expect(component.showAddButton).toBe(true);
        expect(component.loading).toBe(false);
    });

    it('deve emitir evento ao selecionar parada', () => {
        spyOn(component.paradaSelected, 'emit');

        component.onParadaClick(mockParada);

        expect(component.paradaSelected.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve emitir evento ao editar parada', () => {
        spyOn(component.editarParada, 'emit');
        const event = new Event('click');
        spyOn(event, 'stopPropagation');

        component.onEditarParada(mockParada, event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.editarParada.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve emitir evento ao excluir parada', () => {
        spyOn(component.excluirParada, 'emit');
        const event = new Event('click');
        spyOn(event, 'stopPropagation');

        component.onExcluirParada(mockParada, event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.excluirParada.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve emitir evento ao centralizar no mapa', () => {
        spyOn(component.centerOnMap, 'emit');
        const event = new Event('click');
        spyOn(event, 'stopPropagation');

        component.onCenterOnMap(mockParada, event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.centerOnMap.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve emitir evento ao adicionar parada', () => {
        spyOn(component.adicionarParada, 'emit');

        component.onAdicionarParada();

        expect(component.adicionarParada.emit).toHaveBeenCalled();
    });

    it('deve emitir evento ao selecionar parada no mapa', () => {
        spyOn(component.paradaSelected, 'emit');

        component.onMapParadaSelected(mockParada);

        expect(component.paradaSelected.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve retornar configuração do tipo', () => {
        const config = component.getTipoConfig(TipoParada.ABASTECIMENTO);

        expect(config.icon).toBe('local_gas_station');
        expect(config.color).toBe('warn');
        expect(config.label).toBe('Abastecimento');
    });

    it('deve formatar horário corretamente', () => {
        expect(component.formatarHorario('10:30')).toBe('10:30');
        expect(component.formatarHorario(undefined)).toBe('--:--');
    });

    it('deve formatar valor monetário corretamente', () => {
        expect(component.formatarValor(150.50)).toBe('R$ 150,50');
        expect(component.formatarValor(undefined)).toBe('R$ --,--');
    });

    it('deve ordenar paradas cronologicamente', () => {
        const paradas = [
            { ...mockParada, horaChegada: '14:00' },
            { ...mockParada, horaChegada: '10:00' },
            { ...mockParada, horaChegada: undefined },
            { ...mockParada, horaChegada: '12:00' }
        ];
        component.paradas = paradas;

        const ordenadas = component.getParadasOrdenadas();

        expect(ordenadas[0].horaChegada).toBe('10:00');
        expect(ordenadas[1].horaChegada).toBe('12:00');
        expect(ordenadas[2].horaChegada).toBe('14:00');
        expect(ordenadas[3].horaChegada).toBeUndefined();
    });

    it('deve verificar se parada tem coordenadas', () => {
        expect(component.temCoordenadas(mockParada)).toBe(true);

        const paradaSemCoordenadas = { ...mockParada, coordenadas: undefined };
        expect(component.temCoordenadas(paradaSemCoordenadas)).toBe(false);

        const paradaCoordenadaIncompleta = { ...mockParada, coordenadas: [-15.7942] as any };
        expect(component.temCoordenadas(paradaCoordenadaIncompleta)).toBe(false);
    });

    it('deve gerar resumo da parada baseado no tipo', () => {
        // Abastecimento
        const paradaAbast = {
            ...mockParada,
            tipo: TipoParada.ABASTECIMENTO,
            dadosEspecificos: {
                quantidade: 50,
                tipoCombustivel: 'gasolina-comum'
            }
        };
        expect(component.getResumoParada(paradaAbast)).toBe('50L de gasolina-comum');

        // Refeição
        const paradaRef = {
            ...mockParada,
            tipo: TipoParada.REFEICAO,
            dadosEspecificos: {
                tipoRefeicao: 'almoco'
            }
        };
        expect(component.getResumoParada(paradaRef)).toBe('almoco');

        // Ponto de Interesse
        const paradaPonto = {
            ...mockParada,
            tipo: TipoParada.PONTO_INTERESSE,
            dadosEspecificos: {
                categoria: 'turistico'
            }
        };
        expect(component.getResumoParada(paradaPonto)).toBe('turistico');

        // Tipo sem dados específicos
        const paradaSimples = {
            ...mockParada,
            tipo: TipoParada.DESCANSO
        };
        expect(component.getResumoParada(paradaSimples)).toBe('Descanso');
    });

    it('deve ter função trackBy para performance', () => {
        const result = component.trackByParadaId(0, mockParada);
        expect(result).toBe(mockParada.id);

        const paradaSemId = { ...mockParada, id: undefined };
        const resultSemId = component.trackByParadaId(5, paradaSemId);
        expect(resultSemId).toBe('5');
    });
});