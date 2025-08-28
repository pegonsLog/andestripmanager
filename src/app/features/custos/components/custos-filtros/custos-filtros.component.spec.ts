import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CustosFiltrosComponent, FiltrosCustos } from './custos-filtros.component';
import { CustosService } from '../../../../services/custos.service';
import { CategoriaCusto, Custo, RelatorioCustos } from '../../../../models';

describe('CustosFiltrosComponent', () => {
    let component: CustosFiltrosComponent;
    let fixture: ComponentFixture<CustosFiltrosComponent>;
    let mockCustosService: jasmine.SpyObj<CustosService>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

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
            data: '2024-01-02',
            tipo: 'planejado',
            moeda: 'BRL'
        }
    ];

    const mockRelatorio: RelatorioCustos = {
        viagemId: 'viagem-123',
        totalPlanejado: 25.00,
        totalReal: 50.00,
        diferenca: 25.00,
        percentualVariacao: 100.00,
        resumoPorCategoria: [],
        custoMedioPorDia: 37.50,
        dataGeracao: '2024-01-01T00:00:00.000Z'
    };

    beforeEach(async () => {
        const custosServiceSpy = jasmine.createSpyObj('CustosService', ['gerarRelatorio']);
        const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                CustosFiltrosComponent,
                ReactiveFormsModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: CustosService, useValue: custosServiceSpy },
                { provide: MatSnackBar, useValue: snackBarSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CustosFiltrosComponent);
        component = fixture.componentInstance;
        mockCustosService = TestBed.inject(CustosService) as jasmine.SpyObj<CustosService>;
        mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

        // Setup mocks
        mockCustosService.gerarRelatorio.and.returnValue(of(mockRelatorio));

        // Set required inputs
        component.viagemId = 'viagem-123';
        component.custos = mockCustos;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form with empty values', () => {
        expect(component.filtrosForm).toBeDefined();
        expect(component.filtrosForm.get('categoria')?.value).toBe('');
        expect(component.filtrosForm.get('tipo')?.value).toBe('');
    });

    it('should emit filtros when form changes', (done) => {
        component.filtrosAplicados.subscribe((filtros: FiltrosCustos) => {
            expect(filtros.categoria).toBe(CategoriaCusto.COMBUSTIVEL);
            done();
        });

        component.filtrosForm.patchValue({
            categoria: CategoriaCusto.COMBUSTIVEL
        });
    });

    it('should clear filters', () => {
        // Set some filters first
        component.filtrosForm.patchValue({
            categoria: CategoriaCusto.COMBUSTIVEL,
            tipo: 'real'
        });

        component.limparFiltros();

        expect(component.filtrosForm.get('categoria')?.value).toBe(null);
        expect(component.filtrosForm.get('tipo')?.value).toBe(null);
    });

    it('should validate date period correctly', () => {
        // Valid period
        component.filtrosForm.patchValue({
            dataInicio: new Date('2024-01-01'),
            dataFim: new Date('2024-01-02')
        });
        expect(component.validarPeriodo()).toBeTruthy();

        // Invalid period
        component.filtrosForm.patchValue({
            dataInicio: new Date('2024-01-02'),
            dataFim: new Date('2024-01-01')
        });
        expect(component.validarPeriodo()).toBeFalsy();
    });

    it('should validate value range correctly', () => {
        // Valid range
        component.filtrosForm.patchValue({
            valorMinimo: '10',
            valorMaximo: '50'
        });
        expect(component.validarValores()).toBeTruthy();

        // Invalid range
        component.filtrosForm.patchValue({
            valorMinimo: '50',
            valorMaximo: '10'
        });
        expect(component.validarValores()).toBeFalsy();
    });

    it('should export JSON successfully', async () => {
        spyOn(component, 'baixarArquivo' as any);
        spyOn(component.exportarSolicitado, 'emit');

        await component.exportarJSON();

        expect(mockCustosService.gerarRelatorio).toHaveBeenCalledWith('viagem-123');
        expect(component.exportarSolicitado.emit).toHaveBeenCalledWith('json');
        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Dados exportados com sucesso!',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should export CSV successfully', async () => {
        spyOn(component, 'baixarArquivo' as any);
        spyOn(component.exportarSolicitado, 'emit');

        await component.exportarCSV();

        expect(component.exportarSolicitado.emit).toHaveBeenCalledWith('csv');
        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'CSV exportado com sucesso!',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should handle file selection for comprovante', () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const mockEvent = {
            target: {
                files: [mockFile]
            }
        } as any;

        spyOn(component.uploadComprovante, 'emit');

        component.onFileSelected(mockEvent, 'custo-123');

        expect(component.uploadComprovante.emit).toHaveBeenCalledWith({
            custoId: 'custo-123',
            arquivo: mockFile
        });
    });

    it('should reject invalid file types', () => {
        const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const mockEvent = {
            target: {
                files: [mockFile]
            }
        } as any;

        component.onFileSelected(mockEvent, 'custo-123');

        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Tipo de arquivo não permitido. Use JPG, PNG ou PDF.',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should reject files that are too large', () => {
        const mockFile = new File(['x'.repeat(6 * 1024 * 1024)], 'test.jpg', {
            type: 'image/jpeg'
        });
        const mockEvent = {
            target: {
                files: [mockFile]
            }
        } as any;

        component.onFileSelected(mockEvent, 'custo-123');

        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Arquivo muito grande. Máximo 5MB.',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should count active filters correctly', () => {
        expect(component.contarFiltrosAtivos()).toBe(0);

        component.filtrosForm.patchValue({
            categoria: CategoriaCusto.COMBUSTIVEL,
            tipo: 'real'
        });

        // Trigger form change manually for test
        component['aplicarFiltros'](component.filtrosForm.value);

        expect(component.contarFiltrosAtivos()).toBe(2);
    });

    it('should detect if has active filters', () => {
        expect(component.temFiltrosAtivos()).toBeFalsy();

        component.filtrosForm.patchValue({
            categoria: CategoriaCusto.COMBUSTIVEL
        });

        // Trigger form change manually for test
        component['aplicarFiltros'](component.filtrosForm.value);

        expect(component.temFiltrosAtivos()).toBeTruthy();
    });

    it('should get correct category label', () => {
        const label = component.obterLabelCategoria(CategoriaCusto.COMBUSTIVEL);
        expect(label).toBe('Combustível');
    });

    it('should format currency correctly', () => {
        const formatted = component['formatarMoeda'](123.45);
        expect(formatted).toContain('123,45');
        expect(formatted).toContain('R$');
    });

    it('should format date for display correctly', () => {
        const formatted = component['formatarDataExibicao']('2024-01-01');
        expect(formatted).toBe('01/01/2024');
    });

    it('should handle export errors gracefully', async () => {
        mockCustosService.gerarRelatorio.and.returnValue(
            new Observable(subscriber => subscriber.error('Test error'))
        );

        await component.exportarJSON();

        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Erro ao exportar dados. Tente novamente.',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should not export CSV when no custos', async () => {
        component.custos = [];

        await component.exportarCSV();

        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Nenhum custo para exportar',
            'Fechar',
            jasmine.any(Object)
        );
    });
});