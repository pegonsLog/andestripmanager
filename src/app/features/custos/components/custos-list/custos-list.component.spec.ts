import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CustosListComponent } from './custos-list.component';
import { CustosService } from '../../../../services/custos.service';
import { CategoriaCusto, Custo, ResumoCustos, RelatorioCustos } from '../../../../models';

describe('CustosListComponent', () => {
    let component: CustosListComponent;
    let fixture: ComponentFixture<CustosListComponent>;
    let mockCustosService: jasmine.SpyObj<CustosService>;

    const mockCustos: Custo[] = [
        {
            id: '1',
            viagemId: 'viagem-123',
            usuarioId: 'user-123',
            categoria: CategoriaCusto.COMBUSTIVEL,
            descricao: 'Gasolina',
            valor: 50.00,
            data: '2024-01-01',
            tipo: 'real',
            moeda: 'BRL'
        },
        {
            id: '2',
            viagemId: 'viagem-123',
            usuarioId: 'user-123',
            categoria: CategoriaCusto.ALIMENTACAO,
            descricao: 'Almoço',
            valor: 25.00,
            data: '2024-01-01',
            tipo: 'real',
            moeda: 'BRL'
        }
    ];

    const mockResumo: ResumoCustos[] = [
        {
            categoria: CategoriaCusto.COMBUSTIVEL,
            valorTotal: 50.00,
            quantidade: 1,
            percentual: 66.7,
            valorMedio: 50.00
        },
        {
            categoria: CategoriaCusto.ALIMENTACAO,
            valorTotal: 25.00,
            quantidade: 1,
            percentual: 33.3,
            valorMedio: 25.00
        }
    ];

    const mockRelatorio: RelatorioCustos = {
        viagemId: 'viagem-123',
        totalPlanejado: 80.00,
        totalReal: 75.00,
        diferenca: -5.00,
        percentualVariacao: -6.25,
        resumoPorCategoria: mockResumo,
        custoMedioPorDia: 37.50,
        dataGeracao: '2024-01-01T00:00:00.000Z'
    };

    beforeEach(async () => {
        const custosServiceSpy = jasmine.createSpyObj('CustosService', [
            'listarCustosViagem',
            'calcularTotalPorCategoria',
            'gerarRelatorio'
        ]);

        await TestBed.configureTestingModule({
            imports: [
                CustosListComponent,
                NoopAnimationsModule
            ],
            providers: [
                { provide: CustosService, useValue: custosServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CustosListComponent);
        component = fixture.componentInstance;
        mockCustosService = TestBed.inject(CustosService) as jasmine.SpyObj<CustosService>;

        // Setup mocks
        mockCustosService.listarCustosViagem.and.returnValue(of(mockCustos));
        mockCustosService.calcularTotalPorCategoria.and.returnValue(of(mockResumo));
        mockCustosService.gerarRelatorio.and.returnValue(of(mockRelatorio));

        // Set required inputs
        component.viagemId = 'viagem-123';
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load data on init', () => {
        fixture.detectChanges();

        expect(mockCustosService.listarCustosViagem).toHaveBeenCalledWith('viagem-123');
        expect(mockCustosService.calcularTotalPorCategoria).toHaveBeenCalledWith('viagem-123');
        expect(mockCustosService.gerarRelatorio).toHaveBeenCalledWith('viagem-123');
    });

    it('should group custos by categoria', () => {
        const grupos = component.agruparCustosPorCategoria(mockCustos);

        expect(grupos.size).toBe(2);
        expect(grupos.get(CategoriaCusto.COMBUSTIVEL)?.length).toBe(1);
        expect(grupos.get(CategoriaCusto.ALIMENTACAO)?.length).toBe(1);
    });

    it('should calculate total geral correctly', () => {
        const total = component.calcularTotalGeral(mockCustos);
        expect(total).toBe(75.00);
    });

    it('should format currency correctly', () => {
        const formatted = component.formatarMoeda(123.45);
        expect(formatted).toContain('123,45');
        expect(formatted).toContain('R$');
    });

    it('should format date correctly', () => {
        const formatted = component.formatarData('2024-01-01');
        expect(formatted).toBe('01/01/2024');
    });

    it('should format percentage correctly', () => {
        const formatted = component.formatarPercentual(66.666);
        expect(formatted).toBe('66.7%');
    });

    it('should get correct category color', () => {
        const color = component.obterCorCategoria(CategoriaCusto.COMBUSTIVEL);
        expect(color).toBe('#FF6B6B');
    });

    it('should get correct category icon', () => {
        const icon = component.obterIconeCategoria(CategoriaCusto.COMBUSTIVEL);
        expect(icon).toBe('local_gas_station');
    });

    it('should get correct category label', () => {
        const label = component.obterLabelCategoria(CategoriaCusto.COMBUSTIVEL);
        expect(label).toBe('Combustível');
    });

    it('should filter custos by tipo correctly', () => {
        const custosComTipos = [
            ...mockCustos,
            {
                id: '3',
                viagemId: 'viagem-123',
                usuarioId: 'user-123',
                categoria: CategoriaCusto.HOSPEDAGEM,
                descricao: 'Hotel',
                valor: 100.00,
                data: '2024-01-01',
                tipo: 'planejado' as const,
                moeda: 'BRL'
            }
        ];

        const reais = component.filtrarCustosPorTipo(custosComTipos, 'real');
        const planejados = component.filtrarCustosPorTipo(custosComTipos, 'planejado');

        expect(reais.length).toBe(2);
        expect(planejados.length).toBe(1);
    });

    it('should detect if has custos planejados', () => {
        const custosComPlanejados = [
            ...mockCustos,
            {
                id: '3',
                viagemId: 'viagem-123',
                usuarioId: 'user-123',
                categoria: CategoriaCusto.HOSPEDAGEM,
                descricao: 'Hotel',
                valor: 100.00,
                data: '2024-01-01',
                tipo: 'planejado' as const,
                moeda: 'BRL'
            }
        ];

        expect(component.temCustosPlanejados(custosComPlanejados)).toBeTruthy();
        expect(component.temCustosPlanejados(mockCustos)).toBeFalsy();
    });

    it('should detect if has custos reais', () => {
        expect(component.temCustosReais(mockCustos)).toBeTruthy();
    });

    it('should get correct CSS class for tipo custo', () => {
        expect(component.obterClasseTipoCusto('planejado')).toBe('custo-planejado');
        expect(component.obterClasseTipoCusto('real')).toBe('custo-real');
    });

    it('should reload data when recarregar is called', () => {
        fixture.detectChanges();
        mockCustosService.listarCustosViagem.calls.reset();

        component.recarregar();

        expect(mockCustosService.listarCustosViagem).toHaveBeenCalledWith('viagem-123');
    });

    it('should handle empty custos list', () => {
        mockCustosService.listarCustosViagem.and.returnValue(of([]));
        fixture.detectChanges();

        component.custos$.subscribe(custos => {
            expect(custos.length).toBe(0);
        });
    });

    it('should not load relatorio when mostrarRelatorio is false', () => {
        component.mostrarRelatorio = false;
        mockCustosService.gerarRelatorio.calls.reset();

        fixture.detectChanges();

        expect(mockCustosService.gerarRelatorio).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', () => {
        mockCustosService.listarCustosViagem.and.returnValue(
            new Observable(subscriber => subscriber.error('Test error'))
        );

        spyOn(console, 'error');
        fixture.detectChanges();

        expect(console.error).toHaveBeenCalled();
    });
});