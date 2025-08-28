import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';

import { ParadasMapComponent } from './paradas-map.component';
import { Parada, TipoParada } from '../../../models';

describe('ParadasMapComponent', () => {
    let component: ParadasMapComponent;
    let fixture: ComponentFixture<ParadasMapComponent>;

    const mockParada: Parada = {
        id: 'parada-123',
        diaViagemId: 'dia-123',
        viagemId: 'viagem-123',
        tipo: TipoParada.ABASTECIMENTO,
        nome: 'Posto Shell',
        endereco: 'Rua das Flores, 123',
        coordenadas: [-15.7942, -47.8822],
        horaChegada: '10:00',
        custo: 150.50,
        observacoes: 'Posto com bom atendimento'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                ParadasMapComponent,
                NoopAnimationsModule,
                MatBottomSheetModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ParadasMapComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar com valores padrão', () => {
        expect(component.paradas).toEqual([]);
        expect(component.center).toEqual([-15.7942, -47.8822]);
        expect(component.zoom).toBe(6);
        expect(component.height).toBe('400px');
        expect(component.showFilters).toBe(true);
        expect(component.showLegend).toBe(true);
        expect(component.clustered).toBe(true);
    });

    it('deve inicializar estado do componente', () => {
        expect(component.markers).toEqual([]);
        expect(component.isMapReady).toBe(false);
        expect(component.leafletLoaded).toBe(false);
        expect(component.filtroTipo).toBe('todos');
    });

    it('deve ter configurações de ícones para todos os tipos', () => {
        expect(component.tipoIcons[TipoParada.ABASTECIMENTO]).toBeDefined();
        expect(component.tipoIcons[TipoParada.REFEICAO]).toBeDefined();
        expect(component.tipoIcons[TipoParada.PONTO_INTERESSE]).toBeDefined();
        expect(component.tipoIcons[TipoParada.DESCANSO]).toBeDefined();
        expect(component.tipoIcons[TipoParada.MANUTENCAO]).toBeDefined();
        expect(component.tipoIcons[TipoParada.HOSPEDAGEM]).toBeDefined();
    });

    it('deve retornar tipos disponíveis das paradas', () => {
        component.paradas = [
            { ...mockParada, tipo: TipoParada.ABASTECIMENTO },
            { ...mockParada, tipo: TipoParada.REFEICAO },
            { ...mockParada, tipo: TipoParada.ABASTECIMENTO }
        ];

        const tipos = component.getTiposDisponiveis();
        expect(tipos).toContain(TipoParada.ABASTECIMENTO);
        expect(tipos).toContain(TipoParada.REFEICAO);
        expect(tipos.length).toBe(2);
    });

    it('deve retornar configuração do tipo', () => {
        const config = component.getTipoConfig(TipoParada.ABASTECIMENTO);
        expect(config.icon).toBe('local_gas_station');
        expect(config.color).toBe('#ff5722');
        expect(config.label).toBe('Abastecimento');
    });

    it('deve emitir evento quando parada é selecionada', () => {
        spyOn(component.paradaSelected, 'emit');

        (component as any).onMarkerClick(mockParada);

        expect(component.paradaSelected.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve criar conteúdo do popup corretamente', () => {
        const content = (component as any).createPopupContent(mockParada);

        expect(content).toContain(mockParada.nome);
        expect(content).toContain('Abastecimento');
        expect(content).toContain(mockParada.endereco);
        expect(content).toContain(mockParada.horaChegada);
        expect(content).toContain('R$ 150,50');
        expect(content).toContain(mockParada.observacoes);
    });

    it('deve abrir detalhes da parada', () => {
        spyOn(component.paradaSelected, 'emit');
        component.paradas = [mockParada];

        component.openParadaDetails(mockParada.id!);

        expect(component.paradaSelected.emit).toHaveBeenCalledWith(mockParada);
    });

    it('deve limpar marcadores', () => {
        // Simular marcadores existentes
        component.markers = [
            {
                parada: mockParada,
                marker: { remove: jasmine.createSpy('remove') },
                popup: {}
            }
        ];

        (component as any).clearMarkers();

        expect(component.markers).toEqual([]);
    });

    it('deve carregar Leaflet dinamicamente', async () => {
        spyOn(document.head, 'appendChild');

        await (component as any).loadLeaflet();

        expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('deve manipular mudança de filtro', () => {
        spyOn(component as any, 'updateMarkers');

        component.onFiltroTipoChange();

        expect((component as any).updateMarkers).toHaveBeenCalled();
    });

    it('deve centralizar no mapa quando parada tem coordenadas', () => {
        component.isMapReady = true;
        component.map = {
            setView: jasmine.createSpy('setView')
        };

        component.centerOnParada(mockParada);

        expect(component.map.setView).toHaveBeenCalledWith(
            [-15.7942, -47.8822],
            16
        );
    });

    it('não deve centralizar no mapa quando parada não tem coordenadas', () => {
        component.isMapReady = true;
        component.map = {
            setView: jasmine.createSpy('setView')
        };

        const paradaSemCoordenadas = { ...mockParada, coordenadas: undefined };
        component.centerOnParada(paradaSemCoordenadas);

        expect(component.map.setView).not.toHaveBeenCalled();
    });
});