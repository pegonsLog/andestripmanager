import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CustoFormComponent } from './custo-form.component';
import { CustosService } from '../../../../services/custos.service';
import { DiasViagemService } from '../../../../services/dias-viagem.service';
import { CategoriaCusto, MetodoPagamento } from '../../../../models';

describe('CustoFormComponent', () => {
    let component: CustoFormComponent;
    let fixture: ComponentFixture<CustoFormComponent>;
    let mockCustosService: jasmine.SpyObj<CustosService>;
    let mockDiasViagemService: jasmine.SpyObj<DiasViagemService>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        const custosServiceSpy = jasmine.createSpyObj('CustosService', ['criarCusto', 'atualizar']);
        const diasViagemServiceSpy = jasmine.createSpyObj('DiasViagemService', ['listarDiasViagem']);
        const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                CustoFormComponent,
                ReactiveFormsModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: CustosService, useValue: custosServiceSpy },
                { provide: DiasViagemService, useValue: diasViagemServiceSpy },
                { provide: MatSnackBar, useValue: snackBarSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CustoFormComponent);
        component = fixture.componentInstance;
        mockCustosService = TestBed.inject(CustosService) as jasmine.SpyObj<CustosService>;
        mockDiasViagemService = TestBed.inject(DiasViagemService) as jasmine.SpyObj<DiasViagemService>;
        mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

        // Setup mocks
        mockDiasViagemService.listarDiasViagem.and.returnValue(of([]));

        // Set required inputs
        component.viagemId = 'viagem-123';

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form with default values', () => {
        expect(component.custoForm).toBeDefined();
        expect(component.custoForm.get('categoria')?.value).toBe('');
        expect(component.custoForm.get('tipo')?.value).toBe('real');
    });

    it('should validate required fields', () => {
        const form = component.custoForm;

        expect(form.get('categoria')?.hasError('required')).toBeTruthy();
        expect(form.get('descricao')?.hasError('required')).toBeTruthy();
        expect(form.get('valor')?.hasError('required')).toBeTruthy();
        expect(form.get('data')?.hasError('required')).toBeTruthy();
    });

    it('should validate monetary value format', () => {
        const valorControl = component.custoForm.get('valor');

        // Test invalid values
        valorControl?.setValue('abc');
        expect(valorControl?.hasError('pattern')).toBeTruthy();

        valorControl?.setValue('-10');
        expect(valorControl?.hasError('min')).toBeTruthy();

        // Test valid values
        valorControl?.setValue('123,45');
        expect(valorControl?.valid).toBeTruthy();
    });

    it('should format monetary value on input change', () => {
        const event = { target: { value: '123.45' } };
        component.onValorChange(event);

        expect(component.custoForm.get('valor')?.value).toBe('123,45');
    });

    it('should convert value correctly', () => {
        // Use reflection to access private method for testing
        const converterValor = (component as any).converterValor;

        expect(converterValor('123,45')).toBe(123.45);
        expect(converterValor('123.45')).toBe(123.45);
        expect(converterValor('123')).toBe(123);
    });

    it('should emit custoSalvo when creating new custo', async () => {
        spyOn(component.custoSalvo, 'emit');
        mockCustosService.criarCusto.and.returnValue(Promise.resolve('custo-123'));

        // Fill form with valid data
        component.custoForm.patchValue({
            categoria: CategoriaCusto.ALIMENTACAO,
            descricao: 'Almoço',
            valor: '25,50',
            data: new Date(),
            tipo: 'real'
        });

        await component.onSalvar();

        expect(mockCustosService.criarCusto).toHaveBeenCalled();
        expect(component.custoSalvo.emit).toHaveBeenCalled();
    });

    it('should show error message for invalid form', async () => {
        // Leave form empty (invalid)
        await component.onSalvar();

        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Por favor, corrija os erros no formulário',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should load dias viagem on init', () => {
        expect(mockDiasViagemService.listarDiasViagem).toHaveBeenCalledWith('viagem-123');
    });

    it('should emit cancelar when cancel button is clicked', () => {
        spyOn(component.cancelar, 'emit');

        component.onCancelar();

        expect(component.cancelar.emit).toHaveBeenCalled();
    });

    it('should set edit mode when custo is provided', () => {
        const mockCusto = {
            id: 'custo-123',
            viagemId: 'viagem-123',
            usuarioId: 'user-123',
            categoria: CategoriaCusto.COMBUSTIVEL,
            descricao: 'Gasolina',
            valor: 50.00,
            data: '2024-01-01',
            tipo: 'real' as const,
            moeda: 'BRL'
        };

        component.custo = mockCusto;
        component.ngOnInit();

        expect(component.isEditMode).toBeTruthy();
        expect(component.custoForm.get('categoria')?.value).toBe(CategoriaCusto.COMBUSTIVEL);
        expect(component.custoForm.get('descricao')?.value).toBe('Gasolina');
    });
});